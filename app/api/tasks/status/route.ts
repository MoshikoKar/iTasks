import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { logTaskStatusChange } from "@/lib/logging/system-logger";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: "Task ID and status are required" },
        { status: 400 }
      );
    }

    // Validate status is a valid TaskStatus
    if (!Object.values(TaskStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Get the task and check permissions
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        status: true,
        assigneeId: true,
        creatorId: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user has permission to change status
    const canEdit =
      currentUser.role === "Admin" ||
      currentUser.role === "TeamLead" ||
      task.assigneeId === currentUser.id ||
      task.creatorId === currentUser.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to change this task's status" },
        { status: 403 }
      );
    }

    // Update the task status
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: { status },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        taskId,
        actorId: currentUser.id,
        action: "update",
        oldValue: { status: task.status },
        newValue: { status },
      },
    });

    // Log status change
    await logTaskStatusChange(
      taskId,
      task.title,
      currentUser.id,
      task.status,
      status
    );

    // Revalidate paths
    revalidatePath("/");
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${taskId}`);

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    logger.error("Error changing task status", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change status" },
      { status: 500 }
    );
  }
}
