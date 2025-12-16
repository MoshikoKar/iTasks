import { sendMail } from "./smtp";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { formatDateTime } from "./utils/date";

interface TaskNotificationData {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeName: string;
  creatorName: string;
  dueDate?: Date | null;
  slaDeadline?: Date | null;
  actorName?: string;
  changes?: string[];
  commentContent?: string;
  commentAuthor?: string;
}

function getPriorityColor(priority: TaskPriority): string {
  const colors = {
    Low: "#059669",
    Medium: "#2563eb",
    High: "#ea580c",
    Critical: "#dc2626",
  };
  return colors[priority];
}

function getStatusColor(status: TaskStatus): string {
  const colors = {
    Open: "#2563eb",
    InProgress: "#7c3aed",
    PendingVendor: "#ca8a04",
    PendingUser: "#ea580c",
    Resolved: "#059669",
    Closed: "#4b5563",
  };
  return colors[status];
}

function generateEmailHeader(actionText: string): string {
  return `
    <tr>
      <td style="padding:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-radius:12px 12px 0 0; overflow:hidden; background:#1e40af;">
          <tr>
            <td style="padding:20px 24px; text-align:left;">
              <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#ffffff; margin-bottom:4px; opacity:0.9;">ITASKS NOTIFICATION</div>
              <div style="font-size:24px; font-weight:800; color:#ffffff; text-transform:uppercase; letter-spacing:.6px; text-shadow:0 2px 4px rgba(0,0,0,0.1);">${actionText}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function generateTaskSummaryGrid(data: TaskNotificationData): string {
  const priorityColor = getPriorityColor(data.priority);
  const statusColor = getStatusColor(data.status);

  return `
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

                ${
                  data.dueDate || data.slaDeadline
                    ? `
                <tr>
                  ${
                    data.dueDate
                      ? `<td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">DUE DATE</div>
                    <div style="font-size:13px; font-weight:600; color:#111827;">${formatDateTime(data.dueDate!)}</div>
                  </td>`
                      : `<td style="padding:10px 18px; width:50%;"></td>`
                  }
                  ${
                    data.slaDeadline
                      ? `<td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">SLA DEADLINE</div>
                    <div style="font-size:13px; font-weight:600; color:#111827;">${formatDateTime(data.slaDeadline!)}</div>
                  </td>`
                      : `<td style="padding:10px 18px; width:50%;"></td>`
                  }
                </tr>
                `
                    : ""
                }
              </table>
            </td>
          </tr>
  `;
}

function generateCommentBox(commentContent: string, commentAuthor: string, label: string = "Comment"): string {
  return `
          <tr>
            <td style="padding:0 24px 20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; background-color:#eff6ff; border-radius:8px; border:1px solid #dbeafe;">
                <tr>
                  <td style="padding:12px 16px 4px 16px; font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#1d4ed8;">
                    ${label} BY ${commentAuthor.toUpperCase()}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 16px 12px 16px; font-size:13px; color:#111827; white-space:pre-wrap;">
                    ${commentContent.replace(/^\|\s*/gm, '').trim()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
  `;
}

function generateCTAButton(taskId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `
          <tr>
            <td style="padding:18px 24px 24px 24px; text-align:center; border-top:1px solid #e5e7eb;">
              <a href="${baseUrl}/tasks/${taskId}"
                 style="display:inline-block; padding:10px 22px; border-radius:999px; background-color:#2563eb; background-image:linear-gradient(135deg,#2563eb,#4f46e5); color:#ffffff; font-size:13px; font-weight:700; text-decoration:none !important; box-shadow:0 8px 16px rgba(37,99,235,0.35); border:0;">
                <span style="color:#ffffff; text-decoration:none;">View Task</span>
              </a>
            </td>
          </tr>
  `;
}

function generateEmailFooter(): string {
  return `
    <tr>
      <td style="padding:12px 8px 0 8px; text-align:center; font-size:11px; color:#9ca3af;">
        This is an automated notification from <span style="font-weight:600;">iTasks</span>.
      </td>
    </tr>
  `;
}

function generateTaskEmailHTML(data: TaskNotificationData, type: "created" | "updated" | "commented" | "mentioned"): string {
  let actionText = "";
  let actionDescription = "";
  let contentSection = "";

  if (type === "created") {
    actionText = "NEW TASK CREATED";
    actionDescription = `A new task has been created and assigned to you.`;
  } else if (type === "updated") {
    actionText = "TASK UPDATED";
    actionDescription = data.actorName
      ? `${data.actorName} has updated this task.`
      : "This task has been updated.";
    if (data.changes && data.changes.length > 0) {
      actionDescription += `<br><strong>Changes:</strong><ul style="margin: 8px 0; padding-left: 20px;">${data.changes
        .map((c) => `<li>${c}</li>`)
        .join("")}</ul>`;
    }
  } else if (type === "commented") {
    actionText = "NEW COMMENT ADDED";
    actionDescription = data.commentAuthor
      ? `${data.commentAuthor} added a comment on this task.`
      : "A new comment has been added to this task.";
    if (data.commentContent) {
      contentSection = generateCommentBox(data.commentContent, data.commentAuthor || "User", "Comment");
    }
  } else if (type === "mentioned") {
    actionText = "YOU WERE MENTIONED";
    actionDescription = data.commentAuthor
      ? `${data.commentAuthor} mentioned you in task "${data.title}".`
      : `You were mentioned in task "${data.title}".`;
    if (data.commentContent) {
      contentSection = generateCommentBox(data.commentContent, data.commentAuthor || "User", "Mentioned Comment");
    }
  }

  return `
<!DOCTYPE html>
<html lang="en" dir="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:24px; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; line-height:1.6; color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:640px; margin:0 auto; border-collapse:collapse;">
    ${generateEmailHeader(actionText)}

    <tr>
      <td style="padding:0; background-color:#ffffff; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:none;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:20px 24px 8px 24px; font-size:14px; color:#4b5563;">
              ${actionDescription}
            </td>
          </tr>

          ${generateTaskSummaryGrid(data)}

          ${contentSection}

          ${generateCTAButton(data.taskId)}
        </table>
      </td>
    </tr>

    ${generateEmailFooter()}
  </table>
</body>
</html>
  `.trim();
}

export async function notifyTaskCreated(data: TaskNotificationData, assigneeEmail?: string, creatorEmail?: string) {
  const recipients: string[] = [];
  
  if (assigneeEmail) recipients.push(assigneeEmail);
  if (creatorEmail && creatorEmail !== assigneeEmail) recipients.push(creatorEmail);

  if (recipients.length === 0) return;

  const html = generateTaskEmailHTML(data, "created");
  const text = `New Task Created: ${data.title}\n\n${data.description}\n\nStatus: ${data.status}\nPriority: ${data.priority}\nAssignee: ${data.assigneeName}\nCreator: ${data.creatorName}`;

  await sendMail({
    to: recipients,
    subject: `[iTasks] New Task: ${data.title}`,
    text,
    html,
  }).catch((err) => {
    console.error("Failed to send task creation notification:", err);
  });
}

export async function notifyTaskUpdated(data: TaskNotificationData, assigneeEmail?: string, creatorEmail?: string, oldData?: Partial<TaskNotificationData>, actorEmail?: string) {
  const recipients: string[] = [];
  
  if (assigneeEmail) recipients.push(assigneeEmail);
  if (creatorEmail && creatorEmail !== assigneeEmail) recipients.push(creatorEmail);
  if (actorEmail && !recipients.includes(actorEmail)) {
    recipients.push(actorEmail);
  }

  if (recipients.length === 0) return;

  const changes: string[] = [];
  if (oldData) {
    if (oldData.status && oldData.status !== data.status) {
      changes.push(`Status changed from ${oldData.status} to ${data.status}`);
    }
    if (oldData.priority && oldData.priority !== data.priority) {
      changes.push(`Priority changed from ${oldData.priority} to ${data.priority}`);
    }
    if (oldData.title && oldData.title !== data.title) {
      changes.push(`Title changed`);
    }
    if (oldData.assigneeName && oldData.assigneeName !== data.assigneeName) {
      changes.push(`Assignee changed from ${oldData.assigneeName} to ${data.assigneeName}`);
    }
  }

  const html = generateTaskEmailHTML({ ...data, changes }, "updated");
  const text = `Task Updated: ${data.title}\n\n${data.description}\n\nStatus: ${data.status}\nPriority: ${data.priority}${changes.length > 0 ? `\n\nChanges:\n${changes.join("\n")}` : ""}`;

  await sendMail({
    to: recipients,
    subject: `[iTasks] Task Updated: ${data.title}`,
    text,
    html,
  }).catch((err) => {
    console.error("Failed to send task update notification:", err);
  });
}

export async function notifyTaskCommented(data: TaskNotificationData, assigneeEmail?: string, creatorEmail?: string, commentAuthorEmail?: string, additionalRecipients?: string[]) {
  if (!data.commentContent) return;

  const recipients: string[] = [];
  
  if (assigneeEmail) recipients.push(assigneeEmail);
  if (creatorEmail && creatorEmail !== assigneeEmail) recipients.push(creatorEmail);
  if (commentAuthorEmail && !recipients.includes(commentAuthorEmail)) {
    recipients.push(commentAuthorEmail);
  }
  
  if (additionalRecipients) {
    for (const email of additionalRecipients) {
      if (email && !recipients.includes(email)) {
        recipients.push(email);
      }
    }
  }

  if (recipients.length === 0) return;

  const html = generateTaskEmailHTML(data, "commented");
  const text = `New Comment on Task: ${data.title}\n\n${data.commentAuthor || "User"} commented:\n${data.commentContent}\n\nTask: ${data.title}\nStatus: ${data.status}\nPriority: ${data.priority}`;

  await sendMail({
    to: recipients,
    subject: `[iTasks] New Comment on Task: ${data.title}`,
    text,
    html,
  }).catch((err) => {
    console.error("Failed to send comment notification:", err);
  });
}

export async function notifyUserMentioned(data: TaskNotificationData, mentionedUserEmail: string) {
  if (!data.commentContent) return;

  const html = generateTaskEmailHTML(data, "mentioned");
  const text = `You were mentioned in task: ${data.title}\n\n${data.commentAuthor || "User"} mentioned you in a comment:\n${data.commentContent}\n\nTask: ${data.title}\nStatus: ${data.status}\nPriority: ${data.priority}\nAssignee: ${data.assigneeName}\nCreator: ${data.creatorName}`;

  await sendMail({
    to: mentionedUserEmail,
    subject: `[iTasks] You were mentioned in task: ${data.title}`,
    text,
    html,
  }).catch((err) => {
    console.error("Failed to send mention notification:", err);
  });
}
