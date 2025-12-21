import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { Role, LogEntityType, LogActionType } from "@prisma/client";
import { clearSMTPCache } from "@/lib/smtp";
import { createSystemLog } from "@/lib/logging/system-logger";
import { encryptSecret } from "@/lib/ldap";
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

    // Fetch old config BEFORE upsert for change tracking
    const oldConfig = await db.systemConfig.findUnique({ where: { id: "system" } });

    const updateData: any = {};

    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
    if (smtpFrom !== undefined) updateData.smtpFrom = smtpFrom;
    if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    // Only encrypt and update password if it's provided and not empty/null
    // Password is optional even when username is set (e.g., port 25 without auth)
    // If password is null or empty, we don't update it (keeps existing password or allows no password)
    if (smtpPassword !== undefined && smtpPassword !== null && smtpPassword.trim() !== "") {
      try {
        updateData.smtpPassword = encryptSecret(smtpPassword);
      } catch (encryptError: any) {
        logger.error("Error encrypting SMTP password", encryptError);
        return NextResponse.json(
          { error: encryptError.message?.includes('ENCRYPTION_KEY') 
            ? "Encryption key is not configured. Please set ENCRYPTION_KEY environment variable."
            : "Failed to encrypt password. Please check server configuration." },
          { status: 500 }
        );
      }
    }
    // If smtpPassword is null or empty string, we don't add it to updateData
    // This means the existing password (if any) will be preserved, or no password will be used
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
        
        try {
          await createSystemLog({
            entityType: LogEntityType.System,
            actionType: LogActionType.Update,
            actorId: user.id,
            description: `System configuration updated by ${user.name}`,
            metadata: { changes: safeChanges },
          });
        } catch (logError) {
          // Log error but don't fail the request if logging fails
          logger.error("Error creating system log", logError);
        }
      }
    }

    // SECURITY: Redact sensitive fields before returning
    const safeConfig = {
      ...config,
      smtpPassword: config.smtpPassword ? '[REDACTED]' : null,
      ldapBindPassword: config.ldapBindPassword ? '[REDACTED]' : null,
    };

    return NextResponse.json(safeConfig);
  } catch (error: any) {
    logger.error("Error updating system config", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to update system configuration";
    if (error.message) {
      if (error.message.includes('ENCRYPTION_KEY')) {
        errorMessage = "Encryption key is not configured. Please set ENCRYPTION_KEY environment variable.";
      } else if (error.message.includes('Unique constraint')) {
        errorMessage = "Configuration conflict. Please try again.";
      } else if (error.message.includes('Invalid')) {
        errorMessage = `Invalid configuration: ${error.message}`;
      } else if (error.code === 'P2002') {
        errorMessage = "Configuration conflict. Please try again.";
      } else if (error.code === 'P2003') {
        errorMessage = "Invalid reference in configuration.";
      } else {
        // In development, include more details
        if (process.env.NODE_ENV !== 'production') {
          errorMessage = `Failed to update system configuration: ${error.message}`;
        }
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
