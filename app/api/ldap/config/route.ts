import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role, LogActionType, LogEntityType } from '@prisma/client';
import { encryptSecret } from '@/lib/ldap';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireRole([Role.Admin]);

    const config = await db.systemConfig.findUnique({
      where: { id: 'system' },
      select: {
        ldapEnabled: true,
        ldapHost: true,
        ldapPort: true,
        ldapBaseDn: true,
        ldapBindDn: true,
        ldapUseTls: true,
        ldapUserSearchFilter: true,
        ldapUsernameAttribute: true,
        ldapEnforced: true,
      },
    });

    // Never return the password
    return NextResponse.json({
      ldapEnabled: config?.ldapEnabled || false,
      ldapHost: config?.ldapHost || '',
      ldapPort: config?.ldapPort || 389,
      ldapBaseDn: config?.ldapBaseDn || '',
      ldapBindDn: config?.ldapBindDn || '',
      ldapUseTls: config?.ldapUseTls || false,
      ldapUserSearchFilter: config?.ldapUserSearchFilter || '(uid={{username}})',
      ldapUsernameAttribute: config?.ldapUsernameAttribute || 'uid',
      ldapEnforced: config?.ldapEnforced || false,
    });
  } catch (error) {
    logger.error('Error fetching LDAP config', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([Role.Admin]);

    const body = await request.json();
    const {
      ldapEnabled,
      ldapHost,
      ldapPort,
      ldapBaseDn,
      ldapBindDn,
      ldapBindPassword,
      ldapUseTls,
      ldapUserSearchFilter,
      ldapUsernameAttribute,
      ldapEnforced,
    } = body;

    // Encrypt bind password if provided
    let encryptedPassword: string | undefined = undefined;
    if (ldapBindPassword && ldapBindPassword.trim() !== '') {
      encryptedPassword = encryptSecret(ldapBindPassword);
    }

    // Get existing config to check if password was already set
    const existingConfig = await db.systemConfig.findUnique({
      where: { id: 'system' },
      select: { ldapBindPassword: true },
    });

    const updateData: any = {
      ldapEnabled: ldapEnabled || false,
      ldapHost: ldapHost || null,
      ldapPort: ldapPort || 389,
      ldapBaseDn: ldapBaseDn || null,
      ldapBindDn: ldapBindDn || null,
      ldapUseTls: ldapUseTls || false,
      ldapUserSearchFilter: ldapUserSearchFilter || '(uid={{username}})',
      ldapUsernameAttribute: ldapUsernameAttribute || 'uid',
      ldapEnforced: ldapEnforced || false,
      updatedBy: user.id,
    };

    // Only update password if a new one was provided
    if (encryptedPassword) {
      updateData.ldapBindPassword = encryptedPassword;
    } else if (!existingConfig?.ldapBindPassword) {
      // If no existing password and none provided, set to null
      updateData.ldapBindPassword = null;
    }

    await db.systemConfig.upsert({
      where: { id: 'system' },
      create: updateData,
      update: updateData,
    });

    // Log configuration change
    await db.systemLog.create({
      data: {
        entityType: LogEntityType.System,
        actionType: LogActionType.Update,
        actorId: user.id,
        description: `LDAP configuration updated by ${user.name}`,
        metadata: {
          ldapEnabled,
          ldapHost,
          ldapEnforced,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating LDAP config', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update LDAP configuration' },
      { status: 500 }
    );
  }
}
