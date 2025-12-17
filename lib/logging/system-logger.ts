import { db } from "@/lib/db";
import { LogEntityType, LogActionType } from "@prisma/client";

export interface SystemLogData {
  entityType: LogEntityType;
  actionType: LogActionType;
  actorId: string;
  entityId?: string;
  taskId?: string;
  taskTitle?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Centralized system logging utility
 * Creates persistent logs that survive entity deletion
 */
export async function createSystemLog(data: SystemLogData): Promise<void> {
  try {
    await db.systemLog.create({
      data: {
        entityType: data.entityType,
        actionType: data.actionType,
        actorId: data.actorId,
        entityId: data.entityId,
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        description: data.description,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to create system log:", error);
  }
}

/**
 * Log task creation
 */
export async function logTaskCreated(
  taskId: string,
  taskTitle: string,
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Task,
    actionType: LogActionType.Create,
    actorId,
    entityId: taskId,
    taskId,
    taskTitle,
    description: `Task "${taskTitle}" was created`,
    metadata,
  });
}

/**
 * Log task update
 */
export async function logTaskUpdated(
  taskId: string,
  taskTitle: string,
  actorId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  metadata?: Record<string, unknown>
): Promise<void> {
  const changeDescriptions = Object.entries(changes)
    .map(([key, { old, new: newValue }]) => {
      if (old !== newValue) {
        return `${key}: ${String(old)} → ${String(newValue)}`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  await createSystemLog({
    entityType: LogEntityType.Task,
    actionType: LogActionType.Update,
    actorId,
    entityId: taskId,
    taskId,
    taskTitle,
    description: changeDescriptions.length > 0
      ? `Task "${taskTitle}" updated: ${changeDescriptions.join(", ")}`
      : `Task "${taskTitle}" was updated`,
    metadata: {
      ...metadata,
      changes,
    },
  });
}

/**
 * Log task deletion (called BEFORE deletion to preserve data)
 */
export async function logTaskDeleted(
  taskId: string,
  taskTitle: string,
  actorId: string,
  taskData?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Task,
    actionType: LogActionType.Delete,
    actorId,
    entityId: taskId,
    taskId,
    taskTitle,
    description: `Task "${taskTitle}" was deleted`,
    metadata: {
      ...metadata,
      deletedTaskData: taskData,
    },
  });
}

/**
 * Log task assignment
 */
export async function logTaskAssigned(
  taskId: string,
  taskTitle: string,
  actorId: string,
  assigneeId: string,
  assigneeName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Task,
    actionType: LogActionType.Assign,
    actorId,
    entityId: taskId,
    taskId,
    taskTitle,
    description: `Task "${taskTitle}" assigned to ${assigneeName}`,
    metadata: {
      ...metadata,
      assigneeId,
      assigneeName,
    },
  });
}

/**
 * Log task status change
 */
export async function logTaskStatusChange(
  taskId: string,
  taskTitle: string,
  actorId: string,
  oldStatus: string,
  newStatus: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Task,
    actionType: LogActionType.StatusChange,
    actorId,
    entityId: taskId,
    taskId,
    taskTitle,
    description: `Task "${taskTitle}" status changed: ${oldStatus} → ${newStatus}`,
    metadata: {
      ...metadata,
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Log task priority change
 */
export async function logTaskPriorityChange(
  taskId: string,
  taskTitle: string,
  actorId: string,
  oldPriority: string,
  newPriority: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Task,
    actionType: LogActionType.PriorityChange,
    actorId,
    entityId: taskId,
    taskId,
    taskTitle,
    description: `Task "${taskTitle}" priority changed: ${oldPriority} → ${newPriority}`,
    metadata: {
      ...metadata,
      oldPriority,
      newPriority,
    },
  });
}

/**
 * Log comment creation
 */
export async function logCommentCreated(
  commentId: string,
  taskId: string,
  taskTitle: string,
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Comment,
    actionType: LogActionType.Comment,
    actorId,
    entityId: commentId,
    taskId,
    taskTitle,
    description: `Comment added to task "${taskTitle}"`,
    metadata,
  });
}

/**
 * Log attachment upload
 */
export async function logAttachmentUploaded(
  attachmentId: string,
  taskId: string,
  taskTitle: string,
  actorId: string,
  fileName: string,
  fileType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Attachment,
    actionType: LogActionType.Attachment,
    actorId,
    entityId: attachmentId,
    taskId,
    taskTitle,
    description: `Attachment "${fileName}" uploaded to task "${taskTitle}"`,
    metadata: {
      ...metadata,
      fileName,
      fileType,
    },
  });
}

/**
 * Log recurring task creation
 */
export async function logRecurringTaskCreated(
  configId: string,
  configName: string,
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.RecurringTask,
    actionType: LogActionType.Create,
    actorId,
    entityId: configId,
    description: `Recurring task template "${configName}" was created`,
    metadata,
  });
}

/**
 * Log recurring task update
 */
export async function logRecurringTaskUpdated(
  configId: string,
  configName: string,
  actorId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  metadata?: Record<string, unknown>
): Promise<void> {
  const changeDescriptions = Object.entries(changes)
    .map(([key, { old, new: newValue }]) => {
      if (old !== newValue) {
        return `${key}: ${String(old)} → ${String(newValue)}`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  await createSystemLog({
    entityType: LogEntityType.RecurringTask,
    actionType: LogActionType.Update,
    actorId,
    entityId: configId,
    description: changeDescriptions.length > 0
      ? `Recurring task template "${configName}" updated: ${changeDescriptions.join(", ")}`
      : `Recurring task template "${configName}" was updated`,
    metadata: {
      ...metadata,
      changes,
    },
  });
}

/**
 * Log recurring task deletion
 */
export async function logRecurringTaskDeleted(
  configId: string,
  configName: string,
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.RecurringTask,
    actionType: LogActionType.Delete,
    actorId,
    entityId: configId,
    description: `Recurring task template "${configName}" was deleted`,
    metadata,
  });
}

/**
 * Log recurring task generation
 */
export async function logRecurringTaskGenerated(
  configId: string,
  configName: string,
  taskId: string,
  taskTitle: string,
  actorId: string,
  isManual: boolean = false,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.RecurringTask,
    actionType: LogActionType.Generate,
    actorId,
    entityId: configId,
    taskId,
    taskTitle,
    description: `Task "${taskTitle}" generated from recurring template "${configName}" ${isManual ? "(manual)" : "(automatic)"}`,
    metadata: {
      ...metadata,
      isManual,
    },
  });
}

/**
 * Log user creation
 */
export async function logUserCreated(
  userId: string,
  userName: string,
  userEmail: string,
  actorId: string,
  role: string,
  teamId: string | null,
  teamName: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.User,
    actionType: LogActionType.Create,
    actorId,
    entityId: userId,
    description: `User "${userName}" (${userEmail}) created with role ${role}${teamName ? ` in team "${teamName}"` : ""}`,
    metadata: {
      ...metadata,
      userName,
      userEmail,
      role,
      teamId,
      teamName,
    },
  });
}

/**
 * Log user update
 */
export async function logUserUpdated(
  userId: string,
  userName: string,
  actorId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  metadata?: Record<string, unknown>
): Promise<void> {
  const changeDescriptions = Object.entries(changes)
    .map(([key, { old, new: newValue }]) => {
      if (old !== newValue) {
        return `${key}: ${String(old)} → ${String(newValue)}`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  await createSystemLog({
    entityType: LogEntityType.User,
    actionType: LogActionType.Update,
    actorId,
    entityId: userId,
    description: changeDescriptions.length > 0
      ? `User "${userName}" updated: ${changeDescriptions.join(", ")}`
      : `User "${userName}" was updated`,
    metadata: {
      ...metadata,
      changes,
    },
  });
}

/**
 * Log user deletion
 */
export async function logUserDeleted(
  userId: string,
  userName: string,
  userEmail: string,
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.User,
    actionType: LogActionType.Delete,
    actorId,
    entityId: userId,
    description: `User "${userName}" (${userEmail}) was deleted`,
    metadata: {
      ...metadata,
      userName,
      userEmail,
    },
  });
}

/**
 * Log permission/role change
 */
export async function logPermissionChange(
  userId: string,
  userName: string,
  actorId: string,
  oldRole: string,
  newRole: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.User,
    actionType: LogActionType.PermissionChange,
    actorId,
    entityId: userId,
    description: `User "${userName}" role changed: ${oldRole} → ${newRole}`,
    metadata: {
      ...metadata,
      oldRole,
      newRole,
    },
  });
}

/**
 * Log team creation
 */
export async function logTeamCreated(
  teamId: string,
  teamName: string,
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Team,
    actionType: LogActionType.Create,
    actorId,
    entityId: teamId,
    description: `Team "${teamName}" was created`,
    metadata: {
      ...metadata,
      teamName,
    },
  });
}

/**
 * Log team update
 */
export async function logTeamUpdated(
  teamId: string,
  teamName: string,
  actorId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  metadata?: Record<string, unknown>
): Promise<void> {
  const changeDescriptions = Object.entries(changes)
    .map(([key, { old, new: newValue }]) => {
      if (old !== newValue) {
        return `${key}: ${String(old)} → ${String(newValue)}`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  await createSystemLog({
    entityType: LogEntityType.Team,
    actionType: LogActionType.Update,
    actorId,
    entityId: teamId,
    description: changeDescriptions.length > 0
      ? `Team "${teamName}" updated: ${changeDescriptions.join(", ")}`
      : `Team "${teamName}" was updated`,
    metadata: {
      ...metadata,
      changes,
    },
  });
}

/**
 * Log team deletion
 */
export async function logTeamDeleted(
  teamId: string,
  teamName: string,
  actorId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createSystemLog({
    entityType: LogEntityType.Team,
    actionType: LogActionType.Delete,
    actorId,
    entityId: teamId,
    description: `Team "${teamName}" was deleted`,
    metadata: {
      ...metadata,
      teamName,
    },
  });
}
