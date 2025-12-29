import { db } from './db';
import { sendMail } from './smtp';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { logger } from './logger';

interface NotificationRule {
  priority: TaskPriority;
  notificationPercentages: number[]; // e.g., [0.5, 0.75, 0.9] for 50%, 75%, 90% of SLA time
}

interface SentNotification {
  taskId: string;
  notificationPercentage: number;
  sentAt: Date;
}

// Default notification rules - can be made configurable later
const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  { priority: TaskPriority.Critical, notificationPercentages: [0.5, 0.75, 0.9] }, // 50%, 75%, 90% of SLA time
  { priority: TaskPriority.High, notificationPercentages: [0.5, 0.75] }, // 50%, 75% of SLA time
  { priority: TaskPriority.Medium, notificationPercentages: [0.5] }, // 50% of SLA time
  { priority: TaskPriority.Low, notificationPercentages: [0.25] }, // 25% of SLA time (for very long SLAs)
];

// Track sent notifications to avoid duplicates
const sentNotifications = new Map<string, SentNotification[]>();

/**
 * Calculate SLA hours for a given priority
 */
async function getSLAHours(priority: TaskPriority): Promise<number | null> {
  try {
    const config = await db.systemConfig.findUnique({
      where: { id: "system" },
    });

    if (!config) return null;

    switch (priority) {
      case TaskPriority.Critical:
        return config.slaCriticalHours;
      case TaskPriority.High:
        return config.slaHighHours;
      case TaskPriority.Medium:
        return config.slaMediumHours;
      case TaskPriority.Low:
        return config.slaLowHours;
      default:
        return null;
    }
  } catch (error) {
    logger.error("Error getting SLA hours", error);
    return null;
  }
}

/**
 * Get notification rules for a priority
 */
function getNotificationRules(priority: TaskPriority): number[] {
  const rule = DEFAULT_NOTIFICATION_RULES.find(r => r.priority === priority);
  return rule?.notificationPercentages || [0.5]; // Default to 50% if no rule found
}

/**
 * Check if a notification has already been sent for this task and percentage
 */
function hasNotificationBeenSent(taskId: string, percentage: number): boolean {
  const taskNotifications = sentNotifications.get(taskId) || [];
  return taskNotifications.some(n => n.notificationPercentage === percentage);
}

/**
 * Record that a notification has been sent
 */
function recordNotificationSent(taskId: string, percentage: number): void {
  const taskNotifications = sentNotifications.get(taskId) || [];
  taskNotifications.push({
    taskId,
    notificationPercentage: percentage,
    sentAt: new Date(),
  });
  sentNotifications.set(taskId, taskNotifications);

  // Clean up old notifications (keep only last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const [taskId, notifications] of sentNotifications.entries()) {
    const recentNotifications = notifications.filter(n => n.sentAt > oneDayAgo);
    if (recentNotifications.length === 0) {
      sentNotifications.delete(taskId);
    } else {
      sentNotifications.set(taskId, recentNotifications);
    }
  }
}

/**
 * Send due date notification for a task
 */
async function sendDueDateNotification(
  task: {
    id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: Date | null;
    slaDeadline: Date | null;
    assignee: { email: string; name: string } | null;
    creator: { email: string; name: string } | null;
  },
  timeRemaining: number,
  totalSLAHours: number
): Promise<void> {
  if (!task.assignee?.email) {
    return;
  }

  const hoursRemaining = Math.round(timeRemaining / (1000 * 60 * 60) * 10) / 10; // Round to 1 decimal
  const percentageRemaining = (timeRemaining / (totalSLAHours * 60 * 60 * 1000));

  const subject = `[iTasks] Due Date Reminder: ${task.title}`;
  const text = `
Task "${task.title}" is approaching its due date.

Time remaining: ${hoursRemaining} hours (${Math.round(percentageRemaining * 100)}% of SLA time)
Priority: ${task.priority}
Status: ${task.status}
Assignee: ${task.assignee.name}

Please take action to ensure this task is completed on time.

View task: ${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/tasks/${task.id}
  `.trim();

  const html = `
<h2>Due Date Reminder</h2>
<p><strong>Task:</strong> ${task.title}</p>
<p><strong>Description:</strong> ${task.description}</p>
<p><strong>Time remaining:</strong> ${hoursRemaining} hours (${Math.round(percentageRemaining * 100)}% of SLA time)</p>
<p><strong>Priority:</strong> ${task.priority}</p>
<p><strong>Status:</strong> ${task.status}</p>
<p><strong>Assignee:</strong> ${task.assignee.name}</p>

<p>Please take action to ensure this task is completed on time.</p>

<p><a href="${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/tasks/${task.id}">View Task</a></p>
  `.trim();

  const recipients = [task.assignee.email];
  if (task.creator?.email && task.creator.email !== task.assignee.email) {
    recipients.push(task.creator.email);
  }

  try {
    await sendMail({
      to: recipients,
      subject,
      text,
      html,
    });
    logger.info(`Sent due date notification for task ${task.id} (${hoursRemaining} hours remaining)`);
  } catch (error) {
    logger.error(`Failed to send due date notification for task ${task.id}:`, error);
  }
}

/**
 * Main function to send due date notifications
 */
export async function sendDueDateNotifications(): Promise<void> {
  try {
    logger.info('[NotificationScheduler] Starting due date notification check');

    // Get all active tasks with due dates
    const activeTasks = await db.task.findMany({
      where: {
        status: {
          in: [TaskStatus.Open, TaskStatus.InProgress, TaskStatus.PendingVendor, TaskStatus.PendingUser],
        },
        slaDeadline: {
          not: null,
        },
        assignmentStatus: 'ACTIVE', // Only notify for active assignments
      },
      include: {
        assignee: {
          select: { email: true, name: true },
        },
        creator: {
          select: { email: true, name: true },
        },
      },
    });

    logger.info(`[NotificationScheduler] Found ${activeTasks.length} active tasks to check`);

    const now = new Date();
    let notificationsSent = 0;

    for (const task of activeTasks) {
      if (!task.slaDeadline || !task.assignee) {
        continue;
      }

      const slaHours = await getSLAHours(task.priority);
      if (!slaHours) {
        continue; // Skip if no SLA configured for this priority
      }

      const timeRemaining = task.slaDeadline.getTime() - now.getTime();
      const totalSLATime = slaHours * 60 * 60 * 1000; // Convert hours to milliseconds
      const timeElapsed = totalSLATime - timeRemaining;
      const percentageElapsed = timeElapsed / totalSLATime;

      // Get notification rules for this priority
      const notificationPercentages = getNotificationRules(task.priority);

      // Check each notification threshold
      for (const threshold of notificationPercentages) {
        if (percentageElapsed >= threshold && !hasNotificationBeenSent(task.id, threshold)) {
          // Time to send notification
          await sendDueDateNotification(task, timeRemaining, slaHours);
          recordNotificationSent(task.id, threshold);
          notificationsSent++;
          break; // Only send one notification per check (the first threshold reached)
        }
      }
    }

    logger.info(`[NotificationScheduler] Sent ${notificationsSent} due date notifications`);
  } catch (error) {
    logger.error('[NotificationScheduler] Error sending due date notifications:', error);
  }
}
