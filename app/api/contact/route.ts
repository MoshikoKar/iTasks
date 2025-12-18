import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/smtp";
import { createSystemLog } from "@/lib/logging/system-logger";
import { LogEntityType, LogActionType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message, userEmail, userName } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    // Get support email from system config
    const config = await db.systemConfig.findUnique({
      where: { id: "system" },
    });

    const supportEmail = config?.supportEmail;
    if (!supportEmail) {
      return NextResponse.json(
        { error: "Support email is not configured. Please contact your administrator." },
        { status: 500 }
      );
    }

    // Generate email HTML using the same template style as other notifications
    const emailSubject = `[iTasks] Contact Form: ${subject}`;
    const emailBody = `
Contact Form Submission

From: ${userName} (${userEmail})
Subject: ${subject}

Message:
${message}

---
This is an automated notification from iTasks.
    `.trim();

    const emailHtml = `
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
              <div style="font-size:24px; font-weight:800; color:#ffffff; text-transform:uppercase; letter-spacing:.6px; text-shadow:0 2px 4px rgba(0,0,0,0.1);">CONTACT FORM SUBMISSION</div>
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
              A new contact form submission has been received from ${userName}.
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; background-color:#f9fafb; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb;">
                <tr>
                  <td colspan="2" style="padding:16px 18px; border-bottom:1px solid #e5e7eb; border-left:4px solid #2563eb;">
                    <div style="font-size:18px; font-weight:700; color:#111827; margin-bottom:4px;">${subject}</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">FROM</div>
                    <div style="font-size:13px; font-weight:600; color:#111827;">${userName}</div>
                    <div style="font-size:12px; color:#4b5563; margin-top:2px;">${userEmail}</div>
                  </td>
                  <td style="padding:10px 18px; width:50%; vertical-align:top;">
                    <div style="font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:4px;">SUBJECT</div>
                    <div style="font-size:13px; font-weight:600; color:#111827;">${subject}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; background-color:#eff6ff; border-radius:8px; border:1px solid #dbeafe;">
                <tr>
                  <td style="padding:12px 16px 4px 16px; font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:#1d4ed8;">
                    MESSAGE
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 16px 12px 16px; font-size:13px; color:#111827; white-space:pre-wrap;">
                    ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}
                  </td>
                </tr>
              </table>
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

    try {
      await sendMail({
        to: supportEmail,
        subject: emailSubject,
        text: emailBody,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send contact email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email. Please try again later." },
        { status: 500 }
      );
    }

    // Log the contact form submission
    await createSystemLog({
      entityType: LogEntityType.System,
      actionType: LogActionType.Create,
      actorId: user.id,
      description: `Contact form submitted by ${userName}: ${subject}`,
      metadata: {
        subject,
        userEmail,
        userName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "Failed to process contact form submission" },
      { status: 500 }
    );
  }
}
