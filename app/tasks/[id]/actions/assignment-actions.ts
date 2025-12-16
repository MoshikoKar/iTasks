"use server";

import { db } from "@/lib/db";
import { updateTask } from "@/app/actions/tasks";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

/**
 * Assign a task to a user
 */
export async function assignTask(taskId: string, assigneeId: string) {
  const user = await requireAuth();

  // Only Admin and TeamLead can assign tasks
  if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
    throw new Error("Unauthorized: Only Admin and TeamLead can assign tasks");
  }

  await updateTask(taskId, { assigneeId }, user.id);
  revalidatePath(`/tasks/${taskId}`);
}

/**
 * Add a technician (subscriber) to a task
 */
export async function addTechnician(taskId: string, technicianId: string) {
  const user = await requireAuth();

  if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
    throw new Error("Unauthorized: Only Admin and TeamLead can manage technicians");
  }

  await db.task.update({
    where: { id: taskId },
    data: {
      subscribers: {
        connect: { id: technicianId },
      },
    },
  });

  revalidatePath(`/tasks/${taskId}`);
}

/**
 * Remove a technician (subscriber) from a task
 */
export async function removeTechnician(taskId: string, technicianId: string) {
  const user = await requireAuth();

  if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
    throw new Error("Unauthorized: Only Admin and TeamLead can manage technicians");
  }

  await db.task.update({
    where: { id: taskId },
    data: {
      subscribers: {
        disconnect: { id: technicianId },
      },
    },
  });

  revalidatePath(`/tasks/${taskId}`);
}
