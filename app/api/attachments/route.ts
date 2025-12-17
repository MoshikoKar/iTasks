import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAttachmentUploaded } from "@/lib/logging/system-logger";

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

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = join(uploadsDir, fileName);
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
    console.error("Error uploading file:", error);
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
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
