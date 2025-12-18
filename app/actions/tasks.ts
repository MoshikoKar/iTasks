import { db } from "@/lib/db";
import { sendMail } from "@/lib/smtp";
import { notifyTaskCreated, notifyTaskUpdated } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";
import {
  logTaskCreated,
  logTaskUpdated,
  logTaskStatusChange,
  logTaskPriorityChange,
  logTaskAssigned,
} from "@/lib/logging/system-logger";

async function calculateSLADeadline(priority: TaskPriority, createdAt: Date): Promise<Date | null> {
  try {
    const config = await db.systemConfig.findUnique({
      where: { id: "system" },
    });

    if (!config) return null;

    let hours: number | null = null;
    switch (priority) {
      case TaskPriority.Critical:
        hours = config.slaCriticalHours;
        break;
      case TaskPriority.High:
        hours = config.slaHighHours;
        break;
      case TaskPriority.Medium:
        hours = config.slaMediumHours;
        break;
      case TaskPriority.Low:
        hours = config.slaLowHours;
        break;
    }

    if (hours === null || hours <= 0) return null;

    const deadline = new Date(createdAt);
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  } catch (error) {
    console.error("Error calculating SLA deadline:", error);
    return null;
  }
}

export async function createTask(data: {
  title: string;
  description: string;
  dueDate?: Date | string | null;
  slaDeadline?: Date | string | null;
  priority?: TaskPriority;
  branch?: string;
  type?: TaskType;
  tags?: string[];
  creatorId: string;
  assigneeId?: string;
  context?: {
    serverName?: string;
    application?: string;
    workstationId?: string;
    adUser?: string;
    environment?: string;
    ipAddress?: string;
    manufacturer?: string;
    version?: string;
  };
}) {
  const assigneeId = data.assigneeId || data.creatorId;
  const priority = data.priority || TaskPriority.Medium;
  const createdAt = new Date();
  
  // Calculate SLA deadline if not provided
  let slaDeadline: Date | null = null;
  if (data.slaDeadline) {
    slaDeadline = new Date(data.slaDeadline);
  } else {
    slaDeadline = await calculateSLADeadline(priority, createdAt);
  }

  const task = await db.task.create({
    data: {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      slaDeadline,
      priority,
      branch: data.branch || null,
      type: data.type || TaskType.Standard,
      tags: data.tags || [],
      creatorId: data.creatorId,
      assigneeId,
      context: data.context
        ? {
            create: {
              serverName: data.context.serverName,
              application: data.context.application,
              workstationId: data.context.workstationId,
              adUser: data.context.adUser,
              environment: data.context.environment,
              ipAddress: data.context.ipAddress,
              manufacturer: data.context.manufacturer,
              version: data.context.version,
            },
          }
        : undefined,
    },
  });

  await db.auditLog.create({
    data: {
      taskId: task.id,
      actorId: data.creatorId,
      action: "create",
      newValue: task,
    },
  });

  const [assignee, creator] = await Promise.all([
    db.user.findUnique({ where: { id: task.assigneeId }, select: { email: true, name: true } }),
    db.user.findUnique({ where: { id: task.creatorId }, select: { email: true, name: true } }),
  ]);

  // Create system log (persists even if task is deleted)
  await logTaskCreated(
    task.id,
    task.title,
    data.creatorId,
    {
      assigneeId: task.assigneeId,
      assigneeName: assignee?.name,
      priority: task.priority,
      status: task.status,
      branch: task.branch,
      type: task.type,
    }
  );

  await notifyTaskCreated(
    {
      taskId: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeName: assignee?.name || "Unknown",
      creatorName: creator?.name || "Unknown",
      dueDate: task.dueDate,
      slaDeadline: task.slaDeadline,
    },
    assignee?.email,
    creator?.email
  );

  revalidatePath("/"); // dashboard
  revalidatePath("/tasks");
  return task;
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    dueDate: Date | string | null;
    slaDeadline: Date | string | null;
    status: TaskStatus;
    priority: TaskPriority;
    branch: string | null;
    assigneeId: string;
    tags: string[];
  }>,
  actorId: string
) {
  const existing = await db.task.findUnique({
    where: { id },
    include: { creator: true, assignee: true }
  });
  if (!existing) {
    throw new Error("Task not found");
  }

  // Get actor's role to check permissions
  const actor = await db.user.findUnique({ where: { id: actorId } });
  if (!actor) {
    throw new Error("Unauthorized");
  }

  // Allow Admins and TeamLeads to edit any task, others can only edit their own assigned tasks
  const canEdit =
    actor.role === "Admin" ||
    actor.role === "TeamLead" ||
    existing.assigneeId === actorId ||
    existing.creatorId === actorId;

  if (!canEdit) {
    throw new Error("Forbidden: You don't have permission to edit this task");
  }

  const updated = await db.task.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      dueDate: data.dueDate === undefined ? existing.dueDate : data.dueDate ? new Date(data.dueDate) : null,
      slaDeadline:
        data.slaDeadline === undefined ? existing.slaDeadline : data.slaDeadline ? new Date(data.slaDeadline) : null,
      status: data.status ?? existing.status,
      priority: data.priority ?? existing.priority,
      branch: data.branch === undefined ? existing.branch : data.branch,
      assigneeId: data.assigneeId ?? existing.assigneeId,
      tags: data.tags ?? existing.tags,
    },
  });

  const breached =
    updated.slaDeadline && updated.status !== TaskStatus.Resolved && updated.status !== TaskStatus.Closed
      ? new Date() > updated.slaDeadline
      : false;

  await db.auditLog.create({
    data: {
      taskId: id,
      actorId,
      action: "update",
      oldValue: existing,
      newValue: updated,
    },
  });

  // Collect all unique user IDs to fetch in a single query
  const userIdsToFetch = new Set<string>();
  userIdsToFetch.add(updated.assigneeId);
  userIdsToFetch.add(updated.creatorId);
  userIdsToFetch.add(actorId);
  if (existing.assigneeId !== updated.assigneeId) {
    userIdsToFetch.add(updated.assigneeId);
  }

  // Single batched query for all users
  const users = await db.user.findMany({
    where: {
      id: { in: Array.from(userIdsToFetch) },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  // Create a map for O(1) lookup
  const userMap = new Map(users.map((user) => [user.id, user]));

  // Extract users from map
  const assignee = userMap.get(updated.assigneeId);
  const creator = userMap.get(updated.creatorId);
  const actorUser = userMap.get(actorId);
  const newAssignee = existing.assigneeId !== updated.assigneeId
    ? userMap.get(updated.assigneeId)
    : null;

  // Track changes for system log
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  
  if (data.title !== undefined && existing.title !== updated.title) {
    changes.title = { old: existing.title, new: updated.title };
  }
  if (data.description !== undefined && existing.description !== updated.description) {
    changes.description = { old: existing.description, new: updated.description };
  }
  if (data.status !== undefined && existing.status !== updated.status) {
    changes.status = { old: existing.status, new: updated.status };
  }
  if (data.priority !== undefined && existing.priority !== updated.priority) {
    changes.priority = { old: existing.priority, new: updated.priority };
  }
  if (data.assigneeId !== undefined && existing.assigneeId !== updated.assigneeId) {
    changes.assigneeId = { old: existing.assigneeId, new: updated.assigneeId };
  }
  if (data.dueDate !== undefined && existing.dueDate?.getTime() !== updated.dueDate?.getTime()) {
    changes.dueDate = { old: existing.dueDate, new: updated.dueDate };
  }
  if (data.branch !== undefined && existing.branch !== updated.branch) {
    changes.branch = { old: existing.branch, new: updated.branch };
  }

  // Track which specific changes have dedicated logs
  let hasStatusChange = false;
  let hasPriorityChange = false;
  let hasAssigneeChange = false;

  // Create system logs for specific changes
  if (data.status !== undefined && existing.status !== updated.status) {
    hasStatusChange = true;
    await logTaskStatusChange(
      id,
      updated.title,
      actorId,
      existing.status,
      updated.status
    );
  }

  if (data.priority !== undefined && existing.priority !== updated.priority) {
    hasPriorityChange = true;
    await logTaskPriorityChange(
      id,
      updated.title,
      actorId,
      existing.priority,
      updated.priority
    );
  }

  if (data.assigneeId !== undefined && existing.assigneeId !== updated.assigneeId && newAssignee) {
    hasAssigneeChange = true;
    await logTaskAssigned(
      id,
      updated.title,
      actorId,
      updated.assigneeId,
      newAssignee.name
    );
  }

  // Create general update log only for other changes (exclude status, priority, assignee as they have dedicated logs)
  const otherChanges: Record<string, { old: unknown; new: unknown }> = {};
  if (changes.title) otherChanges.title = changes.title;
  if (changes.description) otherChanges.description = changes.description;
  if (changes.dueDate) otherChanges.dueDate = changes.dueDate;
  if (changes.branch) otherChanges.branch = changes.branch;
  // Exclude status, priority, assigneeId from general update log if they have dedicated logs
  if (changes.status && !hasStatusChange) otherChanges.status = changes.status;
  if (changes.priority && !hasPriorityChange) otherChanges.priority = changes.priority;
  if (changes.assigneeId && !hasAssigneeChange) otherChanges.assigneeId = changes.assigneeId;

  // Create general update log only if there are other changes (not already logged specifically)
  if (Object.keys(otherChanges).length > 0) {
    await logTaskUpdated(
      id,
      updated.title,
      actorId,
      otherChanges
    );
  }

  await notifyTaskUpdated(
    {
      taskId: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      assigneeName: assignee?.name || "Unknown",
      creatorName: creator?.name || "Unknown",
      actorName: actorUser?.name,
      dueDate: updated.dueDate,
      slaDeadline: updated.slaDeadline,
    },
    assignee?.email,
    creator?.email,
    {
      status: existing.status,
      priority: existing.priority,
      title: existing.title,
      assigneeName: existing.assignee?.name,
    },
    actorUser?.email
  );

  if (breached) {
    await sendMail({
      to: assignee?.email || "",
      subject: `[iTasks] SLA Breach Alert: ${updated.title}`,
      text: `Task "${updated.title}" is breaching SLA.`,
      html: `<h2>SLA Breach Alert</h2><p>Task "${updated.title}" is breaching SLA. Please take immediate action.</p>`,
    }).catch(() => undefined);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return updated;
}

