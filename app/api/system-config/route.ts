import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { Role, LogEntityType, LogActionType } from "@prisma/client";
import { clearSMTPCache } from "@/lib/smtp";
import { createSystemLog } from "@/lib/logging/system-logger";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await requireRole([Role.Admin]);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let config = await db.systemConfig.findUnique({
      where: { id: "system" },
    });

    if (!config) {
      config = await db.systemConfig.create({
        data: { id: "system" },
      });
    }

    // SECURITY: Redact sensitive fields before returning
    const safeConfig = {
      ...config,
      smtpPassword: config.smtpPassword ? '[REDACTED]' : null,
      ldapBindPassword: config.ldapBindPassword ? '[REDACTED]' : null,
    };

    return NextResponse.json(safeConfig);
  } catch (error) {
    logger.error("Error fetching system config", error);
    return NextResponse.json(
      { error: "Failed to fetch system configuration" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole([Role.Admin]);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      smtpHost,
      smtpPort,
      smtpFrom,
      smtpSecure,
      smtpUser,
      smtpPassword,
      slaLowHours,
      slaMediumHours,
      slaHighHours,
      slaCriticalHours,
      supportEmail,
    } = body;

    const updateData: any = {};

    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
    if (smtpFrom !== undefined) updateData.smtpFrom = smtpFrom;
    if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    if (smtpPassword !== undefined && smtpPassword !== "") {
      updateData.smtpPassword = smtpPassword;
    }
    if (slaLowHours !== undefined) updateData.slaLowHours = slaLowHours;
    if (slaMediumHours !== undefined) updateData.slaMediumHours = slaMediumHours;
    if (slaHighHours !== undefined) updateData.slaHighHours = slaHighHours;
    if (slaCriticalHours !== undefined) updateData.slaCriticalHours = slaCriticalHours;
    if (supportEmail !== undefined) updateData.supportEmail = supportEmail;

    const config = await db.systemConfig.upsert({
      where: { id: "system" },
      update: updateData,
      create: {
        id: "system",
        ...updateData,
      },
    });

    // Clear SMTP cache when SMTP settings are updated
    if (Object.keys(updateData).some(key => key.startsWith('smtp'))) {
      clearSMTPCache();
    }

    // Log configuration changes
    const user = await getCurrentUser();
    if (user) {
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      const oldConfig = await db.systemConfig.findUnique({ where: { id: "system" } });
      
      for (const [key, newValue] of Object.entries(updateData)) {
        const oldValue = oldConfig ? (oldConfig as any)[key] : null;
        if (oldValue !== newValue) {
          changes[key] = { old: oldValue, new: newValue };
        }
      }

      if (Object.keys(changes).length > 0) {
        // SECURITY: Redact sensitive fields in log metadata
        const safeChanges: Record<string, { old: unknown; new: unknown }> = {};
        for (const [key, value] of Object.entries(changes)) {
          if (key === 'smtpPassword' || key === 'ldapBindPassword') {
            safeChanges[key] = {
              old: value.old ? '[REDACTED]' : null,
              new: value.new ? '[REDACTED]' : null,
            };
          } else {
            safeChanges[key] = value;
          }
        }
        
        await createSystemLog({
          entityType: LogEntityType.System,
          actionType: LogActionType.Update,
          actorId: user.id,
          description: `System configuration updated by ${user.name}`,
          metadata: { changes: safeChanges },
        });
      }
    }

    // SECURITY: Redact sensitive fields before returning
    const safeConfig = {
      ...config,
      smtpPassword: config.smtpPassword ? '[REDACTED]' : null,
      ldapBindPassword: config.ldapBindPassword ? '[REDACTED]' : null,
    };

    return NextResponse.json(safeConfig);
  } catch (error) {
    logger.error("Error updating system config", error);
    return NextResponse.json(
      { error: "Failed to update system configuration" },
      { status: 500 }
    );
  }
}
