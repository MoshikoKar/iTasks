"use server";

import { db } from "@/lib/db";
import { updateTask } from "@/app/actions/tasks";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { createAddedAsSubscriberNotification } from "@/lib/notifications";

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

  // Create UI notification for the added subscriber
  await createAddedAsSubscriberNotification(taskId, technicianId, user.id);

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

/**
 * Approve an assignment request
 */
export async function approveAssignmentRequest(taskId: string) {
  const user = await requireAuth();

  // Only Admin and TeamLead can approve assignments
  if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
    throw new Error("Unauthorized: Only Admin and TeamLead can approve assignments");
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/tasks/${taskId}/assignment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'approve' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve assignment');
  }

  revalidatePath(`/tasks/${taskId}`);
}

/**
 * Reject an assignment request
 */
export async function rejectAssignmentRequest(taskId: string) {
  const user = await requireAuth();

  // Only Admin and TeamLead can reject assignments
  if (user.role !== Role.Admin && user.role !== Role.TeamLead) {
    throw new Error("Unauthorized: Only Admin and TeamLead can reject assignments");
  }

  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/tasks/${taskId}/assignment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'reject' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject assignment');
  }

  revalidatePath(`/tasks/${taskId}`);
}