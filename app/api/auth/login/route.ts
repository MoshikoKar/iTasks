import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { authenticateLDAP, getLDAPConfig } from "@/lib/ldap";
import { AuthProvider, LogActionType, LogEntityType } from "@prisma/client";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { authRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const PBKDF2_ITERATIONS = 310000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

async function loginHandler(request: NextRequest) {
  try {
    // Rate limiting for authentication
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateLimitResult = authRateLimiter.check(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Get LDAP configuration
    const ldapConfig = await getLDAPConfig();

    // Step 1: Try local authentication first
    let user = await db.user.findUnique({ where: { email } });
    
    if (user && user.authProvider === AuthProvider.local) {
      // Verify local password
      if (verifyPassword(user.passwordHash, password)) {
        // Log successful login
        await db.systemLog.create({
          data: {
            entityType: LogEntityType.System,
            actionType: LogActionType.Login,
            actorId: user.id,
            description: `User ${user.name} logged in (local auth)`,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        // Create session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.session.create({
          data: {
            token: sessionToken,
            userId: user.id,
            expiresAt: sessionExpiresAt,
          },
        });

        const response = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
        // In development, use lax sameSite and allow insecure cookies for local network access
        const isDevelopment = process.env.NODE_ENV === 'development';
        response.cookies.set(SESSION_COOKIE, sessionToken, {
          httpOnly: true,
          sameSite: isDevelopment ? "lax" : "strict", // lax allows cross-site requests in dev
          secure: !isDevelopment, // Allow insecure cookies in development for local network
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return response;
      }
      
      // Local user but wrong password
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Step 2: If LDAP is enabled and user is not a local user, try LDAP
    if (ldapConfig && ldapConfig.enabled) {
      // Parse username from email - supports multiple formats:
      // - username@domain.com
      // - domain\username
      // - username
      const { parseUsernameInput } = await import('@/lib/ldap');
      const parsed = parseUsernameInput(email);
      const username = parsed.username;
      
      logger.info('Attempting LDAP authentication', {
        input: email,
        parsedUsername: username,
        parsedDomain: parsed.domain,
      });
      const ldapResult = await authenticateLDAP(username, password);
      
      if (!ldapResult.success) {
        logger.error('LDAP authentication failed', {
          username,
          email,
          error: ldapResult.error,
          ldapEnabled: ldapConfig.enabled,
          ldapHost: ldapConfig.host,
          ldapPort: ldapConfig.port,
          ldapBaseDn: ldapConfig.baseDn,
          ldapBindDn: ldapConfig.bindDn ? '***configured***' : 'NOT SET',
        });
      }
      
      if (ldapResult.success && ldapResult.user) {
        // Check if user exists in database
        if (user && user.authProvider === AuthProvider.ldap) {
          // Update existing LDAP user
          user = await db.user.update({
            where: { id: user.id },
            data: {
              name: ldapResult.user.name,
            },
          });
        } else if (!user) {
          // Create new LDAP user on first login
          // Default role is Viewer, admin needs to promote
          const randomPassword = crypto.randomBytes(32).toString('hex');
          user = await db.user.create({
            data: {
              email: ldapResult.user.email,
              name: ldapResult.user.name,
              role: 'Viewer',
              authProvider: AuthProvider.ldap,
              passwordHash: hashPassword(randomPassword), // Not used for LDAP users
            },
          });

          // Log user creation
          await db.systemLog.create({
            data: {
              entityType: LogEntityType.User,
              actionType: LogActionType.Create,
              actorId: user.id,
              entityId: user.id,
              description: `LDAP user ${user.name} auto-created on first login`,
            },
          });
        }

        // Log successful login
        await db.systemLog.create({
          data: {
            entityType: LogEntityType.System,
            actionType: LogActionType.Login,
            actorId: user.id,
            description: `User ${user.name} logged in (LDAP auth)`,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        // Create session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.session.create({
          data: {
            token: sessionToken,
            userId: user.id,
            expiresAt: sessionExpiresAt,
          },
        });

        const response = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
        // In development, use lax sameSite and allow insecure cookies for local network access
        const isDevelopment = process.env.NODE_ENV === 'development';
        response.cookies.set(SESSION_COOKIE, sessionToken, {
          httpOnly: true,
          sameSite: isDevelopment ? "lax" : "strict", // lax allows cross-site requests in dev
          secure: !isDevelopment, // Allow insecure cookies in development for local network
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return response;
      }
    }

    // If we reach here, authentication failed
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    logger.error("Error during login", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}

export const POST = loginHandler;
