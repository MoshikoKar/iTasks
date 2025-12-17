"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { logTaskDeleted } from "@/lib/logging/system-logger";

/**
 * Delete a task and all related records
 * System logs are preserved even after task deletion
 */
export async function deleteTaskAction(taskId: string) {
  const user = await requireAuth();

  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      context: true,
    },
  });

  if (!existingTask) {
    throw new Error("Task not found");
  }

  const canDelete =
    user.role === Role.Admin ||
    user.role === Role.TeamLead ||
    existingTask.creatorId === user.id;

  if (!canDelete) {
    throw new Error("Forbidden: You don't have permission to delete this task");
  }

  // Log deletion BEFORE deleting the task (preserves task data in system log)
  await logTaskDeleted(
    taskId,
    existingTask.title,
    user.id,
    {
      taskId: existingTask.id,
      title: existingTask.title,
      description: existingTask.description,
      status: existingTask.status,
      priority: existingTask.priority,
      branch: existingTask.branch,
      type: existingTask.type,
      tags: existingTask.tags,
      creatorId: existingTask.creatorId,
      creatorName: existingTask.creator?.name,
      assigneeId: existingTask.assigneeId,
      assigneeName: existingTask.assignee?.name,
      dueDate: existingTask.dueDate,
      slaDeadline: existingTask.slaDeadline,
      createdAt: existingTask.createdAt,
      updatedAt: existingTask.updatedAt,
      context: existingTask.context,
    }
  );

  // Delete related records first to avoid foreign key constraint violations
  // Note: SystemLog entries are NOT deleted - they persist after task deletion
  await db.taskContext.deleteMany({
    where: { taskId },
  });

  await db.comment.deleteMany({
    where: { taskId },
  });

  await db.attachment.deleteMany({
    where: { taskId },
  });

  // AuditLog entries are deleted (they have required foreign key)
  // SystemLog entries remain (they have optional foreign key)
  await db.auditLog.deleteMany({
    where: { taskId },
  });

  // Delete the task itself
  await db.task.delete({
    where: { id: taskId },
  });

  redirect("/tasks");
}

/**
 * Server action wrapper that accepts FormData (for client components)
 */
export async function deleteTaskActionFormData(formData: FormData) {
  "use server";
  const taskId = formData.get("taskId")?.toString();
  
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  await deleteTaskAction(taskId);
}
