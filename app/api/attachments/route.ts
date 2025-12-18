import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAttachmentUploaded } from "@/lib/logging/system-logger";
import { logger } from "@/lib/logger";
import path from "path";

// SECURITY: File upload constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  // Office documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword', // .doc
  'application/vnd.ms-excel', // .xls
  'application/vnd.ms-powerpoint', // .ppt
];

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    
    const taskId = formData.get("taskId")?.toString();
    const file = formData.get("file") as File | null;

    if (!taskId || !file) {
      return NextResponse.json(
        { error: "Task ID and file are required" },
        { status: 400 }
      );
    }

    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // SECURITY: Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed. Allowed types: PDF, images, text files, and Office documents.` },
        { status: 400 }
      );
    }

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", taskId);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // SECURITY: Generate unique filename with improved sanitization
    const timestamp = Date.now();
    
    // Get basename to prevent path traversal
    const baseName = path.basename(file.name);
    
    // Remove path traversal sequences and dangerous characters
    let sanitizedFileName = baseName
      .replace(/\.\./g, '') // Remove path traversal
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric (except dots and hyphens) with underscore
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255); // Limit length to prevent filesystem issues
    
    // Ensure filename is not empty after sanitization
    if (!sanitizedFileName || sanitizedFileName.trim() === '') {
      sanitizedFileName = 'uploaded_file';
    }
    
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = join(uploadsDir, fileName);
    
    // SECURITY: Additional check - ensure resolved path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      logger.error("Path traversal attempt detected", { fileName, resolvedPath, resolvedUploadsDir });
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }
    
    const relativePath = `/uploads/${taskId}/${fileName}`;

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save attachment record to database
    const attachment = await db.attachment.create({
      data: {
        taskId,
        uploadedBy: user.id,
        filePath: relativePath,
        fileType: file.type || "application/octet-stream",
      },
    });

    // Log attachment upload
    await logAttachmentUploaded(
      attachment.id,
      taskId,
      task.title,
      user.id,
      file.name,
      file.type || "application/octet-stream"
    );

    return NextResponse.json({
      id: attachment.id,
      fileName: file.name,
      filePath: relativePath,
      fileType: file.type || "application/octet-stream",
      uploadedBy: user.id,
      createdAt: attachment.createdAt,
    });
  } catch (error) {
    logger.error("Error uploading file", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const attachments = await db.attachment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    logger.error("Error fetching attachments", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
