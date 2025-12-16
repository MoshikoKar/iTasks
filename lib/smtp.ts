import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "localhost";
const port = Number(process.env.SMTP_PORT || 25);

export const smtpTransport = nodemailer.createTransport({
  host,
  port,
  secure: false,
  tls: { rejectUnauthorized: false },
});

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}) {
  const from = options.from || process.env.SMTP_FROM || "no-reply@local";
  return smtpTransport.sendMail({ ...options, from });
}

