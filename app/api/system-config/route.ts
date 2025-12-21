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
    // Check if this is a FormData request (for file uploads) or JSON
    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (file upload)
      const formData = await request.formData();
      body = {
        smtpHost: formData.get('smtpHost'),
        smtpPort: formData.get('smtpPort'),
        smtpFrom: formData.get('smtpFrom'),
        smtpSecure: formData.get('smtpSecure'),
        smtpUser: formData.get('smtpUser'),
        smtpPassword: formData.get('smtpPassword'),
        slaLowHours: formData.get('slaLowHours'),
        slaMediumHours: formData.get('slaMediumHours'),
        slaHighHours: formData.get('slaHighHours'),
        slaCriticalHours: formData.get('slaCriticalHours'),
        supportEmail: formData.get('supportEmail'),
        // Branding & Reports
        orgLogo: formData.get('orgLogo'),
        orgLogoFile: formData.get('orgLogoFile') as File | null,
        reportFooterText: formData.get('reportFooterText'),
        // Localization & Time
        timezone: formData.get('timezone'),
        dateFormat: formData.get('dateFormat'),
        timeFormat: formData.get('timeFormat'),
        // Collaboration & Content
        enableAttachments: formData.get('enableAttachments'),
        maxAttachmentSizeMb: formData.get('maxAttachmentSizeMb'),
        enableComments: formData.get('enableComments'),
        enableMentions: formData.get('enableMentions'),
        // Security & Authentication
        sessionTimeoutHours: formData.get('sessionTimeoutHours'),
        maxFailedLoginAttempts: formData.get('maxFailedLoginAttempts'),
        lockUserAfterFailedLogins: formData.get('lockUserAfterFailedLogins'),
        passwordPolicyLevel: formData.get('passwordPolicyLevel'),
        // Audit & Retention
        auditRetentionDays: formData.get('auditRetentionDays'),
      };
    } else {
      // Handle JSON
      body = await request.json();
    }

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
      // Branding & Reports
      orgLogo,
      orgLogoFile,
      reportFooterText,
      // Localization & Time
      timezone,
      dateFormat,
      timeFormat,
      // Collaboration & Content
      enableAttachments,
      maxAttachmentSizeMb,
      enableComments,
      enableMentions,
      // Security & Authentication
      sessionTimeoutHours,
      maxFailedLoginAttempts,
      lockUserAfterFailedLogins,
      passwordPolicyLevel,
      // Audit & Retention
      auditRetentionDays,
    } = body;

    // Fetch old config BEFORE upsert for change tracking
    const oldConfig = await db.systemConfig.findUnique({ where: { id: "system" } });

    const updateData: any = {};

    // Helper to check if a value was actually provided (not undefined and not null from FormData)
    const isProvided = (val: unknown) => val !== undefined && val !== null;

    if (isProvided(smtpHost)) updateData.smtpHost = smtpHost;
    if (isProvided(smtpPort)) updateData.smtpPort = typeof smtpPort === 'string' ? parseInt(smtpPort, 10) : smtpPort;
    if (isProvided(smtpFrom)) updateData.smtpFrom = smtpFrom;
    if (isProvided(smtpSecure)) updateData.smtpSecure = smtpSecure === true || smtpSecure === 'true';
    if (isProvided(smtpUser)) updateData.smtpUser = smtpUser;
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
    if (isProvided(slaLowHours)) updateData.slaLowHours = typeof slaLowHours === 'string' ? parseInt(slaLowHours, 10) : slaLowHours;
    if (isProvided(slaMediumHours)) updateData.slaMediumHours = typeof slaMediumHours === 'string' ? parseInt(slaMediumHours, 10) : slaMediumHours;
    if (isProvided(slaHighHours)) updateData.slaHighHours = typeof slaHighHours === 'string' ? parseInt(slaHighHours, 10) : slaHighHours;
    if (isProvided(slaCriticalHours)) updateData.slaCriticalHours = typeof slaCriticalHours === 'string' ? parseInt(slaCriticalHours, 10) : slaCriticalHours;
    if (isProvided(supportEmail)) updateData.supportEmail = supportEmail || null;

    // Branding & Reports
    if (orgLogo !== undefined) updateData.orgLogo = orgLogo;
    // reportFooterText can be explicitly set to null (to clear it), so check for undefined
    if (reportFooterText !== undefined) {
      // Convert empty strings to null to ensure proper handling
      const trimmedFooter = typeof reportFooterText === 'string' ? reportFooterText.trim() : reportFooterText;
      updateData.reportFooterText = trimmedFooter && trimmedFooter.length > 0 ? trimmedFooter : null;
    }

    // Localization & Time
    if (isProvided(timezone)) updateData.timezone = timezone;
    if (isProvided(dateFormat)) updateData.dateFormat = dateFormat;
    if (isProvided(timeFormat)) updateData.timeFormat = timeFormat;

    // Collaboration & Content
    if (isProvided(enableAttachments)) updateData.enableAttachments = enableAttachments === true || enableAttachments === 'true';
    if (isProvided(maxAttachmentSizeMb)) updateData.maxAttachmentSizeMb = typeof maxAttachmentSizeMb === 'string' ? parseInt(maxAttachmentSizeMb, 10) : maxAttachmentSizeMb;
    if (isProvided(enableComments)) updateData.enableComments = enableComments === true || enableComments === 'true';
    if (isProvided(enableMentions)) updateData.enableMentions = enableMentions === true || enableMentions === 'true';

    // Security & Authentication
    if (isProvided(sessionTimeoutHours)) updateData.sessionTimeoutHours = typeof sessionTimeoutHours === 'string' ? parseInt(sessionTimeoutHours, 10) : sessionTimeoutHours;
    if (isProvided(maxFailedLoginAttempts)) updateData.maxFailedLoginAttempts = typeof maxFailedLoginAttempts === 'string' ? parseInt(maxFailedLoginAttempts, 10) : maxFailedLoginAttempts;
    if (isProvided(lockUserAfterFailedLogins)) updateData.lockUserAfterFailedLogins = lockUserAfterFailedLogins === true || lockUserAfterFailedLogins === 'true';
    if (isProvided(passwordPolicyLevel)) updateData.passwordPolicyLevel = passwordPolicyLevel;

    // Audit & Retention
    if (isProvided(auditRetentionDays)) updateData.auditRetentionDays = typeof auditRetentionDays === 'string' ? parseInt(auditRetentionDays, 10) : auditRetentionDays;

    // Handle logo file upload
    if (orgLogoFile && orgLogoFile instanceof File) {
      try {
        // Create uploads directory if it doesn't exist
        const fs = require('fs').promises;
        const path = require('path');
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');

        try {
          await fs.access(uploadDir);
        } catch {
          await fs.mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const fileExt = path.extname(orgLogoFile.name) || '.png';
        const fileName = `logo_${Date.now()}_${Math.random().toString(36).substring(2)}${fileExt}`;
        const filePath = path.join(uploadDir, fileName);

        // Save the file
        const buffer = Buffer.from(await orgLogoFile.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        // Store the public URL
        updateData.orgLogo = `/uploads/logos/${fileName}`;
      } catch (fileError: any) {
        logger.error("Error uploading logo file", fileError);
        return NextResponse.json(
          { error: "Failed to upload logo file" },
          { status: 500 }
        );
      }
    } else if (orgLogo !== undefined) {
      // Handle URL-based logo
      updateData.orgLogo = orgLogo;
    }

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
    
    // Provide human-readable error messages
    let errorMessage = "Failed to update system configuration. Please try again.";
    
    if (error.code) {
      // Prisma error codes - provide friendly messages
      switch (error.code) {
        case 'P2002':
          errorMessage = "A configuration with this value already exists. Please use a different value.";
          break;
        case 'P2003':
          errorMessage = "Invalid reference. One of the selected values does not exist.";
          break;
        case 'P2025':
          errorMessage = "Configuration record not found. It may have been deleted.";
          break;
        case 'P2006':
          // Extract field name from error if possible
          const fieldMatch = error.message?.match(/Argument `(\w+)`/);
          const fieldName = fieldMatch ? fieldMatch[1] : 'field';
          errorMessage = `Invalid value for '${fieldName}'. Please check the input and try again.`;
          break;
        case 'P2011':
          const nullFieldMatch = error.message?.match(/Argument `(\w+)` must not be null/);
          const nullField = nullFieldMatch ? nullFieldMatch[1] : 'A required field';
          errorMessage = `${nullField} is required and cannot be empty.`;
          break;
        default:
          if (error.code.startsWith('P2')) {
            errorMessage = "Database validation error. Please check your inputs and try again.";
          }
      }
    } else if (error.message) {
      if (error.message.includes('ENCRYPTION_KEY')) {
        errorMessage = "Server encryption is not configured. Please contact your administrator.";
      } else if (error.message.includes('must not be null')) {
        const nullFieldMatch = error.message.match(/Argument `(\w+)` must not be null/);
        const nullField = nullFieldMatch ? nullFieldMatch[1] : 'A required field';
        errorMessage = `${nullField} is required and cannot be empty.`;
      } else if (error.message.includes('Invalid')) {
        // Clean up the Prisma invocation path from error messages
        const cleanMessage = error.message.replace(/`[^`]+`\s+invocation in[\s\S]*?→\s*\d+\s+/g, '');
        errorMessage = `Invalid configuration: ${cleanMessage.split('\n')[0]}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
