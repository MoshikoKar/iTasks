"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

/**
 * Delete a task and all related records
 */
export async function deleteTaskAction(taskId: string) {
  const user = await requireAuth();

  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    select: { creatorId: true },
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

  // Delete related records first to avoid foreign key constraint violations
  await db.taskContext.deleteMany({
    where: { taskId },
  });

  await db.comment.deleteMany({
    where: { taskId },
  });

  await db.attachment.deleteMany({
    where: { taskId },
  });

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
