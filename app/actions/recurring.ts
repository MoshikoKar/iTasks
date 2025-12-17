import { db } from "@/lib/db";
import { TaskType, TaskStatus } from "@prisma/client";
import { sendMail } from "@/lib/smtp";
import parser from "cron-parser";
import { logRecurringTaskGenerated } from "@/lib/logging/system-logger";

export async function generateRecurringTasks() {
  const now = new Date();
  const configs = await db.recurringTaskConfig.findMany({
    where: {
      OR: [{ nextGenerationAt: null }, { nextGenerationAt: { lte: now } }],
    },
    include: {
      templateAssignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  for (const config of configs) {
    try {
      const task = await db.task.create({
        data: {
          title: config.templateTitle,
          description: config.templateDescription || "",
          priority: config.templatePriority,
          branch: config.templateBranch || null,
          type: TaskType.Recurring_Instance,
          creatorId: config.templateAssigneeId,
          assigneeId: config.templateAssigneeId,
          recurringConfigId: config.id,
          tags: [],
          status: TaskStatus.Open,
          context: (config.templateServerName || config.templateApplication || config.templateIpAddress)
            ? {
                create: {
                  serverName: config.templateServerName || null,
                  application: config.templateApplication || null,
                  ipAddress: config.templateIpAddress || null,
                },
              }
            : undefined,
        },
      });

      await db.auditLog.create({
        data: {
          taskId: task.id,
          actorId: config.templateAssigneeId,
          action: "recurring_generate",
          newValue: task,
        },
      });

      // Log recurring task generation (persists even if task is deleted)
      await logRecurringTaskGenerated(
        config.id,
        config.name,
        task.id,
        task.title,
        config.templateAssigneeId,
        false, // automatic generation
        {
          cron: config.cron,
          priority: task.priority,
        }
      );

      const next = computeNext(config.cron, now);
      await db.recurringTaskConfig.update({
        where: { id: config.id },
        data: {
          lastGeneratedAt: now,
          nextGenerationAt: next,
        },
      });

      const [assignee, creator] = await Promise.all([
        db.user.findUnique({ 
          where: { id: task.assigneeId }, 
          select: { name: true, email: true } 
        }),
        db.user.findUnique({ 
          where: { id: task.creatorId }, 
          select: { name: true, email: true } 
        }),
      ]);

      if (assignee?.email) {
        await sendMail({
          to: assignee.email,
          subject: `Recurring Task Due: ${task.title}`,
          text: `A recurring task has been generated and assigned to you.\n\nTask: ${task.title}\n\nDescription: ${task.description || "No description"}\n\nStatus: ${task.status}\nPriority: ${task.priority}\n\nPlease review and complete this task.`,
          html: generateRecurringTaskEmailHTML({
            taskId: task.id,
            title: task.title,
            description: task.description || "",
            status: task.status,
            priority: task.priority,
            assigneeName: assignee.name || "Unknown",
            creatorName: creator?.name || "System",
          }),
        }).catch((err) => {
          console.error(`Failed to send recurring task notification email to ${assignee.email}:`, err);
        });
      }
    } catch (error) {
      console.error(`Error generating recurring task for config ${config.id}:`, error);
    }
  }
}

function computeNext(cron: string, from: Date): Date {
  try {
    const interval = parser.parse(cron, {
      tz: 'Asia/Jerusalem',
      currentDate: from,
    });
    const nextDate = interval.next().toDate();
    return nextDate;
  } catch (error) {
    console.error(`Invalid cron expression "${cron}", falling back to 24h offset:`, error);
    return new Date(from.getTime() + 24 * 60 * 60 * 1000);
  }
}

function generateRecurringTaskEmailHTML(data: {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  assigneeName: string;
  creatorName: string;
}): string {
  const priorityColor = getPriorityColor(data.priority);
  const statusColor = getStatusColor(data.status);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="en" dir="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:24px; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; line-height:1.6; color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:640px; margin:0 auto; border-collapse:collapse;">
    <tr>
      <td style="padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-radius:12px 12px 0 0; overflow:hidden; background:#1e40af;">
          <tr>
            <td style="padding:20px 24px; text-align:left;">
              <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#ffffff; margin-bottom:4px; opacity:0.9;">ITASKS NOTIFICATION</div>
              <div style="font-size:24px; font-weight:800; color:#ffffff; text-transform:uppercase; letter-spacing:.6px; text-shadow:0 2px 4px rgba(0,0,0,0.1);">RECURRING TASK DUE</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0; background-color:#ffffff; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:none;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:20px 24px 8px 24px; font-size:14px; color:#4b5563;">
              A recurring task has been generated and assigned to you.
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; background-color:#f9fafb; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb;">
                <tr>
                  <td colspan="2" style="padding:16px 18px; border-bottom:1px solid #e5e7eb; border-left:4px solid ${priorityColor};">
                    <div style="font-size:18px; font-weight:700; color:#111827; margin-bottom:4px;">${data.title}</div>
                    <div style="font-size:13px; color:#4b5563; white-space:pre-wrap;">${data.description}</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">STATUS</div>
                    <span style="display:inline-block; padding:5px 14px; border-radius:999px; font-size:12px; font-weight:700; background:${statusColor}; color:#ffffff; border:1px solid ${statusColor};">${data.status}</span>
                  </td>
                  <td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">PRIORITY</div>
                    <span style="display:inline-block; padding:5px 14px; border-radius:999px; font-size:12px; font-weight:700; background:${priorityColor}; color:#ffffff; border:1px solid ${priorityColor};">${data.priority}</span>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">ASSIGNEE</div>
                    <div style="font-size:13px; font-weight:600; color:#111827;">${data.assigneeName}</div>
                  </td>
                  <td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">CREATOR</div>
                    <div style="font-size:13px; font-weight:600; color:#111827;">${data.creatorName}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px 24px 24px; text-align:center; border-top:1px solid #e5e7eb;">
              <a href="${baseUrl}/tasks/${data.taskId}"
                 style="display:inline-block; padding:10px 22px; border-radius:999px; background-color:#2563eb; background-image:linear-gradient(135deg,#2563eb,#4f46e5); color:#ffffff; font-size:13px; font-weight:700; text-decoration:none !important; box-shadow:0 8px 16px rgba(37,99,235,0.35); border:0;">
                <span style="color:#ffffff; text-decoration:none;">View Task</span>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:12px 8px 0 8px; text-align:center; font-size:11px; color:#9ca3af;">
        This is an automated notification from <span style="font-weight:600;">iTasks</span>.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Low: "#059669",
    Medium: "#2563eb",
    High: "#ea580c",
    Critical: "#dc2626",
  };
  return colors[priority] || "#2563eb";
}

function getStatusColor(status: TaskStatus): string {
  const colors: Record<string, string> = {
    Open: "#2563eb",
    InProgress: "#7c3aed",
    PendingVendor: "#ca8a04",
    PendingUser: "#ea580c",
    Resolved: "#059669",
    Closed: "#4b5563",
  };
  return colors[status] || "#2563eb";
}

