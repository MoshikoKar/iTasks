import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const attachment = await db.attachment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            assigneeId: true,
            creatorId: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const canDelete =
      user.role === "Admin" ||
      attachment.uploadedBy === user.id ||
      attachment.task.assigneeId === user.id ||
      attachment.task.creatorId === user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to delete this attachment" },
        { status: 403 }
      );
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), "public", attachment.filePath);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Delete attachment record
    await db.attachment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
