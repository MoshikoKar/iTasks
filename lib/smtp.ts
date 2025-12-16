import nodemailer from "nodemailer";
import { db } from "./db";

let cachedConfig: {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user?: string;
  password?: string;
} | null = null;
let configCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getSMTPConfig() {
  const now = Date.now();
  if (cachedConfig && now - configCacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const config = await db.systemConfig.findUnique({
      where: { id: "system" },
    });

    if (config) {
      cachedConfig = {
        host: config.smtpHost || process.env.SMTP_HOST || "localhost",
        port: config.smtpPort ?? Number(process.env.SMTP_PORT || 25),
        secure: config.smtpSecure ?? false,
        from: config.smtpFrom || process.env.SMTP_FROM || "no-reply@local",
        user: config.smtpUser || undefined,
        password: config.smtpPassword || undefined,
      };
    } else {
      cachedConfig = {
        host: process.env.SMTP_HOST || "localhost",
        port: Number(process.env.SMTP_PORT || 25),
        secure: false,
        from: process.env.SMTP_FROM || "no-reply@local",
      };
    }
    configCacheTime = now;
    return cachedConfig;
  } catch (error) {
    console.error("Error fetching SMTP config from database:", error);
    return {
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT || 25),
      secure: false,
      from: process.env.SMTP_FROM || "no-reply@local",
    };
  }
}

async function getSMTPTransport() {
  const config = await getSMTPConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password
      ? {
          user: config.user,
          pass: config.password,
        }
      : undefined,
    tls: { rejectUnauthorized: false },
  });
}

export async function sendMail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}) {
  const config = await getSMTPConfig();
  const transport = await getSMTPTransport();
  const from = options.from || config.from;
  return transport.sendMail({ ...options, from });
}

export function clearSMTPCache() {
  cachedConfig = null;
  configCacheTime = 0;
}

