import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { testLDAPConnection, testLDAPConnectionWithAutoDiscovery } from '@/lib/ldap';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await requireRole([Role.Admin]);

    const body = await request.json();
    const {
      ldapHost,
      ldapPort,
      ldapBaseDn,
      ldapBindDn,
      ldapBindPassword,
      ldapUseTls,
      ldapUserSearchFilter,
      ldapUsernameAttribute,
      // Auto-discovery fields
      ldapUsername,
      ldapDomain,
      useAutoDiscovery,
    } = body;

    // Auto-discovery mode
    if (useAutoDiscovery) {
      if (!ldapHost || !ldapPort || !ldapUsername || !ldapDomain || !ldapBindPassword) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields for auto-discovery' },
          { status: 400 }
        );
      }

      const result = await testLDAPConnectionWithAutoDiscovery(
        ldapHost,
        parseInt(ldapPort),
        ldapUsername,
        ldapDomain,
        ldapBindPassword,
        ldapUseTls || false,
        ldapBaseDn
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Connection successful! Auto-discovered Bind DN and Base DN.',
          discoveredBindDn: result.discoveredBindDn,
          discoveredBaseDn: result.discoveredBaseDn,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error,
          discoveredBaseDn: result.discoveredBaseDn,
        });
      }
    }

    // Manual mode (existing behavior)
    if (!ldapHost || !ldapPort || !ldapBaseDn || !ldapBindDn || !ldapBindPassword) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Test the connection
    const result = await testLDAPConnection({
      host: ldapHost,
      port: parseInt(ldapPort),
      baseDn: ldapBaseDn,
      bindDn: ldapBindDn,
      bindPassword: ldapBindPassword,
      useTls: ldapUseTls || false,
      userSearchFilter: ldapUserSearchFilter || '(uid={{username}})',
      usernameAttribute: ldapUsernameAttribute || 'uid',
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Connection successful' });
    } else {
      return NextResponse.json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error('Error testing LDAP connection', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}
