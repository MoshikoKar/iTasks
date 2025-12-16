import { db } from "@/lib/db";
import { sendMail } from "@/lib/smtp";
import { notifyTaskCreated, notifyTaskUpdated } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";

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

  const [assignee, creator, actorUser] = await Promise.all([
    db.user.findUnique({ where: { id: updated.assigneeId }, select: { email: true, name: true } }),
    db.user.findUnique({ where: { id: updated.creatorId }, select: { email: true, name: true } }),
    db.user.findUnique({ where: { id: actorId }, select: { email: true, name: true } }),
  ]);

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

