import { db } from "@/lib/db";
import { sendMail } from "@/lib/smtp";
import { notifyTaskCreated, notifyTaskUpdated } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { TaskPriority, TaskStatus, TaskType, AssignmentStatus, Role } from "@prisma/client";
import {
  logTaskCreated,
  logTaskUpdated,
  logTaskStatusChange,
  logTaskPriorityChange,
  logTaskAssigned,
} from "@/lib/logging/system-logger";
import { requireAuth } from "@/lib/auth";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/taskSchema";
import { logger } from "@/lib/logger";
import { clearDashboardCache } from "./dashboard";

export async function approveAssignmentRequest(taskId: string) {
  const user = await requireAuth();
  const actorId = user.id;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, creator: true, requestedBy: true }
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.assignmentStatus !== AssignmentStatus.PENDING_APPROVAL) {
    throw new Error("Task is not pending approval");
  }

  // Only the current assignee (TeamLead) can approve
  if (task.assigneeId !== actorId) {
    throw new Error("Only the assigned user can approve assignment requests");
  }

  // Update task to active status
  const updatedTask = await db.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        assignmentStatus: AssignmentStatus.ACTIVE,
        requestedByUserId: null, // Clear the request info
      },
    });

    // Log approval
    await tx.auditLog.create({
      data: {
        taskId,
        actorId,
        action: "assignment_approved",
        oldValue: { assignmentStatus: AssignmentStatus.PENDING_APPROVAL, requestedByUserId: task.requestedByUserId },
        newValue: { assignmentStatus: AssignmentStatus.ACTIVE },
      },
    });

    return updated;
  });

  // Log system event
  await logTaskAssigned(
    taskId,
    task.title,
    actorId,
    updatedTask.assigneeId,
    task.assignee.name
  );

  // Send notifications
  await notifyTaskUpdated(
    {
      taskId: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeName: task.assignee.name,
      creatorName: task.creator.name,
      actorName: user.name,
      dueDate: task.dueDate,
      slaDeadline: task.slaDeadline,
    },
    task.assignee.email,
    task.creator.email,
    {
      status: task.status,
      priority: task.priority,
      title: task.title,
      assigneeName: task.assignee.name,
    },
    user.email,
    task.assignee.id,
    task.id,
    user.id
  );

  revalidatePath("/tasks");
  revalidatePath("/");

  clearDashboardCache(updatedTask.assigneeId);
  if (task.requestedByUserId) {
    clearDashboardCache(task.requestedByUserId);
  }

  return updatedTask;
}

export async function rejectAssignmentRequest(taskId: string) {
  const user = await requireAuth();
  const actorId = user.id;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, creator: true, requestedBy: true }
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (task.assignmentStatus !== AssignmentStatus.PENDING_APPROVAL) {
    throw new Error("Task is not pending approval");
  }

  // Only the current assignee (TeamLead) can reject
  if (task.assigneeId !== actorId) {
    throw new Error("Only the assigned user can reject assignment requests");
  }

  // Get the original assignee before the request
  const auditLog = await db.auditLog.findFirst({
    where: {
      taskId,
      action: "assignment_requested",
    },
    orderBy: { createdAt: "desc" },
  });

  let originalAssigneeId = task.creatorId; // Fallback to creator
  if (auditLog?.oldValue && typeof auditLog.oldValue === 'object') {
    const oldValue = auditLog.oldValue as any;
    if (oldValue.assigneeId) {
      originalAssigneeId = oldValue.assigneeId;
    }
  }

  // Update task to rejected and revert assignee
  const updatedTask = await db.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        assignmentStatus: AssignmentStatus.REJECTED,
        assigneeId: originalAssigneeId,
        requestedByUserId: null, // Clear the request info
      },
    });

    // Log rejection
    await tx.auditLog.create({
      data: {
        taskId,
        actorId,
        action: "assignment_rejected",
        oldValue: { assignmentStatus: AssignmentStatus.PENDING_APPROVAL, requestedByUserId: task.requestedByUserId, assigneeId: task.assigneeId },
        newValue: { assignmentStatus: AssignmentStatus.REJECTED, assigneeId: originalAssigneeId },
      },
    });

    return updated;
  });

  // Get the original assignee user info
  const originalAssignee = await db.user.findUnique({
    where: { id: originalAssigneeId },
    select: { name: true, email: true }
  });

  if (originalAssignee) {
    // Log system event for reassignment back
    await logTaskAssigned(
      taskId,
      task.title,
      actorId,
      originalAssigneeId,
      originalAssignee.name
    );

    // Send notifications
    await notifyTaskUpdated(
      {
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeName: originalAssignee.name,
        creatorName: task.creator.name,
        actorName: user.name,
        dueDate: task.dueDate,
        slaDeadline: task.slaDeadline,
      },
      originalAssignee.email,
      task.creator.email,
      {
        status: task.status,
        priority: task.priority,
        title: task.title,
        assigneeName: task.assignee.name,
      },
      user.email,
      originalAssignee.id,
      task.id,
      user.id
    );
  }

  revalidatePath("/tasks");
  revalidatePath("/");

  clearDashboardCache(updatedTask.assigneeId);
  if (task.requestedByUserId) {
    clearDashboardCache(task.requestedByUserId);
  }
  clearDashboardCache(originalAssigneeId);

  return updatedTask;
}

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
    logger.error("Error calculating SLA deadline", error);
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
  // SECURITY: Get authenticated user - never trust client-provided creatorId
  const user = await requireAuth();
  const creatorId = user.id;

  // Convert Date objects to ISO strings and handle empty strings for Zod validation
  const dataForValidation = {
    ...data,
    dueDate: data.dueDate instanceof Date
      ? data.dueDate.toISOString()
      : (data.dueDate === '' || data.dueDate === undefined ? null : data.dueDate),
    slaDeadline: data.slaDeadline instanceof Date
      ? data.slaDeadline.toISOString()
      : (data.slaDeadline === '' || data.slaDeadline === undefined ? null : data.slaDeadline),
    creatorId, // Add authenticated creatorId for validation
    assigneeId: data.assigneeId || creatorId,
  };

  // Validate input with Zod schema
  const validationResult = createTaskSchema.safeParse(dataForValidation);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues
      ? validationResult.error.issues.map(e => e.message).join(", ")
      : "Validation failed";
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  const validatedData = validationResult.data;
  const assigneeId = validatedData.assigneeId || creatorId;
  const priority = validatedData.priority || TaskPriority.Medium;
  const createdAt = new Date();
  
  // Calculate SLA deadline if not provided
  let slaDeadline: Date | null = null;
  if (validatedData.slaDeadline) {
    slaDeadline = new Date(validatedData.slaDeadline);
  } else {
    slaDeadline = await calculateSLADeadline(priority, createdAt);
  }

  // Create task and audit log in a transaction
  const task = await db.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        slaDeadline,
        priority: validatedData.priority,
        branch: validatedData.branch || null,
        type: validatedData.type || TaskType.Standard,
        tags: validatedData.tags || [],
        creatorId, // ✅ Always use authenticated user's ID
        assigneeId,
        context: validatedData.context
          ? {
              create: {
                serverName: validatedData.context.serverName,
                application: validatedData.context.application,
                workstationId: validatedData.context.workstationId,
                adUser: validatedData.context.adUser,
                environment: validatedData.context.environment,
                ipAddress: validatedData.context.ipAddress,
                manufacturer: validatedData.context.manufacturer,
                version: validatedData.context.version,
              },
            }
          : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        taskId: createdTask.id,
        actorId: creatorId, // ✅ Use authenticated user's ID
        action: "create",
        newValue: createdTask,
      },
    });

    return createdTask;
  });

  const [assignee, creator] = await Promise.all([
    db.user.findUnique({ where: { id: task.assigneeId }, select: { email: true, name: true } }),
    db.user.findUnique({ where: { id: task.creatorId }, select: { email: true, name: true } }),
  ]);

  // Create system log (persists even if task is deleted)
  await logTaskCreated(
    task.id,
    task.title,
    creatorId, // ✅ Use authenticated user's ID
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
    creator?.email,
    assignee?.id,
    task.id
  );

  revalidatePath("/"); // dashboard
  revalidatePath("/tasks");

  // Clear dashboard cache for assignee and creator
  clearDashboardCache(task.assigneeId);
  if (task.creatorId !== task.assigneeId) {
    clearDashboardCache(task.creatorId);
  }

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
  // Validate input with Zod schema
  const validationResult = updateTaskSchema.safeParse(data);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.issues
      ? validationResult.error.issues.map(e => e.message).join(", ")
      : "Validation failed";
    throw new Error(`Validation failed: ${errorMessages}`);
  }
  const validatedData = validationResult.data;
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

  // Handle assignment logic
  if (validatedData.assigneeId !== undefined && validatedData.assigneeId !== existing.assigneeId) {
    const newAssignee = await db.user.findUnique({
      where: { id: validatedData.assigneeId },
      select: { role: true, name: true }
    });

    if (!newAssignee) {
      throw new Error("Assignee not found");
    }

    // Check assignment permissions
    const roleHierarchy = { Admin: 3, TeamLead: 2, Technician: 1, Viewer: 0 };

    // Admins can assign to anyone
    if (actor.role !== "Admin") {
      // Non-admins cannot assign to Admins
      if (newAssignee.role === "Admin") {
        throw new Error("Forbidden: Cannot assign tasks to Admin users");
      }

      // Cannot assign to users with equal or higher role (except Technician -> TeamLead)
      if (roleHierarchy[newAssignee.role] >= roleHierarchy[actor.role]) {
        // Allow Technician -> TeamLead assignment as pending approval
        if (actor.role === "Technician" && newAssignee.role === "TeamLead") {
          // This will be handled as a pending assignment below
        } else {
          throw new Error("Forbidden: Cannot assign to users with equal or higher role");
        }
      }
    }

    // Check if this is a Technician requesting assignment to TeamLead
    if (actor.role === "Technician" && newAssignee.role === "TeamLead" && actorId !== validatedData.assigneeId) {
      // Create a pending assignment request instead of direct assignment
      const pendingTask = await db.$transaction(async (tx) => {
        const updated = await tx.task.update({
          where: { id },
          data: {
            assignmentStatus: AssignmentStatus.PENDING_APPROVAL,
            requestedByUserId: actorId,
            // Keep other fields unchanged except for audit logging
          },
        });

        await tx.auditLog.create({
          data: {
            taskId: id,
            actorId,
            action: "assignment_requested",
            oldValue: { assigneeId: existing.assigneeId, assignmentStatus: existing.assignmentStatus },
            newValue: { assigneeId: validatedData.assigneeId, assignmentStatus: AssignmentStatus.PENDING_APPROVAL, requestedByUserId: actorId },
          },
        });

        return updated;
      });

      // Log the assignment request
      await logTaskAssigned(
        id,
        existing.title,
        actorId,
        validatedData.assigneeId,
        newAssignee.name
      );

      // Send notification to the TeamLead about the request
      await notifyTaskUpdated(
        {
          taskId: existing.id,
          title: existing.title,
          description: existing.description,
          status: existing.status,
          priority: existing.priority,
          assigneeName: newAssignee.name,
          creatorName: existing.creator?.name,
          actorName: actor.name,
          dueDate: existing.dueDate,
          slaDeadline: existing.slaDeadline,
        },
        newAssignee.email,
        existing.creator?.email,
        {
          status: existing.status,
          priority: existing.priority,
          title: existing.title,
          assigneeName: existing.assignee?.name,
        },
        actor.email,
        newAssignee.id,
        existing.id,
        actorId
      );

      revalidatePath("/tasks");
      revalidatePath("/");

      clearDashboardCache(newAssignee.id);
      clearDashboardCache(actorId);

      return pendingTask;
    }
  }

  // Update task and create audit log in a transaction
  const result = await db.$transaction(async (tx) => {
    // Determine new priority and check if it changed
    const newPriority = validatedData.priority ?? existing.priority;
    const priorityChanged = validatedData.priority !== undefined && validatedData.priority !== existing.priority;

    // Recalculate SLA deadline if priority changed and no explicit SLA was provided
    let newSlaDeadline = validatedData.slaDeadline === undefined ? existing.slaDeadline : validatedData.slaDeadline ? new Date(validatedData.slaDeadline) : null;
    if (priorityChanged && validatedData.slaDeadline === undefined) {
      // Only recalculate if SLA deadline wasn't explicitly provided
      newSlaDeadline = await calculateSLADeadline(newPriority, existing.createdAt);
    }

    const updated = await tx.task.update({
      where: { id },
      data: {
        title: validatedData.title ?? existing.title,
        description: validatedData.description ?? existing.description,
        dueDate: validatedData.dueDate === undefined ? existing.dueDate : validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        slaDeadline: newSlaDeadline,
        status: validatedData.status ?? existing.status,
        priority: newPriority,
        branch: validatedData.branch === undefined ? existing.branch : validatedData.branch,
        assigneeId: validatedData.assigneeId ?? existing.assigneeId,
        assignmentStatus: validatedData.assigneeId ? AssignmentStatus.ACTIVE : existing.assignmentStatus,
        tags: validatedData.tags ?? existing.tags,
      },
    });

    const breached =
      updated.slaDeadline && updated.status !== TaskStatus.Resolved && updated.status !== TaskStatus.Closed
        ? new Date() > updated.slaDeadline
        : false;

    await tx.auditLog.create({
      data: {
        taskId: id,
        actorId,
        action: "update",
        oldValue: existing,
        newValue: updated,
      },
    });

    return { updated, breached };
  });

  const { updated, breached } = result;

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
  
  if (validatedData.title !== undefined && existing.title !== updated.title) {
    changes.title = { old: existing.title, new: updated.title };
  }
  if (validatedData.description !== undefined && existing.description !== updated.description) {
    changes.description = { old: existing.description, new: updated.description };
  }
  if (validatedData.status !== undefined && existing.status !== updated.status) {
    changes.status = { old: existing.status, new: updated.status };
  }
  if (validatedData.priority !== undefined && existing.priority !== updated.priority) {
    changes.priority = { old: existing.priority, new: updated.priority };
  }
  if (validatedData.assigneeId !== undefined && existing.assigneeId !== updated.assigneeId) {
    changes.assigneeId = { old: existing.assigneeId, new: updated.assigneeId };
  }
  if (validatedData.dueDate !== undefined && existing.dueDate?.getTime() !== updated.dueDate?.getTime()) {
    changes.dueDate = { old: existing.dueDate, new: updated.dueDate };
  }
  if (validatedData.branch !== undefined && existing.branch !== updated.branch) {
    changes.branch = { old: existing.branch, new: updated.branch };
  }

  // Track which specific changes have dedicated logs
  let hasStatusChange = false;
  let hasPriorityChange = false;
  let hasAssigneeChange = false;

  // Create system logs for specific changes
  if (validatedData.status !== undefined && existing.status !== updated.status) {
    hasStatusChange = true;
    await logTaskStatusChange(
      id,
      updated.title,
      actorId,
      existing.status,
      updated.status
    );
  }

  if (validatedData.priority !== undefined && existing.priority !== updated.priority) {
    hasPriorityChange = true;
    await logTaskPriorityChange(
      id,
      updated.title,
      actorId,
      existing.priority,
      updated.priority
    );
  }

  if (validatedData.assigneeId !== undefined && existing.assigneeId !== updated.assigneeId && newAssignee) {
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
    actorUser?.email,
    assignee?.id,
    updated.id,
    actorUser?.id
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

  // Clear dashboard cache for assignee and creator
  clearDashboardCache(updated.assigneeId);
  if (updated.creatorId !== updated.assigneeId) {
    clearDashboardCache(updated.creatorId);
  }

  // If assignee changed, also clear cache for old assignee
  if (existing.assigneeId !== updated.assigneeId) {
    clearDashboardCache(existing.assigneeId);
  }

  return updated;
}

