"use server";

import { db } from "@/lib/db";
import { updateTask } from "@/app/actions/tasks";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";

/**
 * Change task status
 */
export async function changeStatus(taskId: string, status: TaskStatus) {
  const user = await requireAuth();
  await updateTask(taskId, { status }, user.id);
  revalidatePath(`/tasks/${taskId}`);
}

/**
 * Server action wrapper that accepts FormData (for client components)
 */
export async function changeStatusFormData(formData: FormData) {
  "use server";
  const taskId = formData.get("taskId")?.toString();
  const status = formData.get("status") as TaskStatus;
  
  if (!taskId || !status) {
    throw new Error("Task ID and status are required");
  }

  await changeStatus(taskId, status);
}

/**
 * Server action wrapper for changing status (accepts taskId via FormData)
 * This can be passed to client components
 */
export async function changeStatusAction(formData: FormData) {
  "use server";
  const taskId = formData.get("taskId")?.toString();
  const status = formData.get("status") as TaskStatus;
  
  if (!taskId || !status) {
    throw new Error("Task ID and status are required");
  }

  await changeStatus(taskId, status);
}

/**
 * Save task edits (description, status, priority, due date, context)
 */
export async function saveTask(formData: FormData) {
  const user = await requireAuth();
  const taskId = formData.get("taskId")?.toString();
  
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, creatorId: true },
  });

  if (!existingTask) {
    throw new Error("Task not found");
  }

  const canManage =
    user.role === Role.Admin ||
    user.role === Role.TeamLead ||
    existingTask.assigneeId === user.id ||
    existingTask.creatorId === user.id;

  if (!canManage) {
    throw new Error("Forbidden: You don't have permission to edit this task");
  }

  const description = formData.get("description")?.toString() ?? "";
  const status = formData.get("status") as TaskStatus;
  const priority = formData.get("priority") as TaskPriority;
  const dueDateRaw = formData.get("dueDate")?.toString() || "";

  const serverName = formData.get("serverName")?.toString() || null;
  const application = formData.get("application")?.toString() || null;
  const workstationId = formData.get("workstationId")?.toString() || null;
  const adUser = formData.get("adUser")?.toString() || null;
  const environment = formData.get("environment")?.toString() || null;
  const ipAddress = formData.get("ipAddress")?.toString() || null;
  const manufacturer = formData.get("manufacturer")?.toString() || null;
  const version = formData.get("version")?.toString() || null;

  // Update core task fields (Title is immutable)
  await updateTask(
    taskId,
    {
      description,
      status,
      priority,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
    user.id
  );

  // Update linked assets (context)
  await db.task.update({
    where: { id: taskId },
    data: {
      context: {
        upsert: {
          create: {
            serverName,
            application,
            workstationId,
            adUser,
            environment,
            ipAddress,
            manufacturer,
            version,
          },
          update: {
            serverName,
            application,
            workstationId,
            adUser,
            environment,
            ipAddress,
            manufacturer,
            version,
          },
        },
      },
    },
  });

  revalidatePath(`/tasks/${taskId}`);
}
