import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { Role } from "@prisma/client";
import { SESSION_COOKIE } from "./constants";
const PBKDF2_ITERATIONS = 310000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

export function verifyPassword(storedHash: string, candidate: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.pbkdf2Sync(candidate, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
  const provided = Buffer.from(hash, "hex");
  const compared = Buffer.from(derived, "hex");
  return provided.length === compared.length && crypto.timingSafeEqual(provided, compared);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  // Find valid session and include user data
  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  // Check if session exists and is not expired
  if (!session || session.expiresAt < new Date()) {
    // Clean up expired session
    if (session) {
      await db.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    // Throw error for API routes to catch and return 401
    // Page components should use getCurrentUser() + redirect() pattern instead
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
  return user;
}

export async function getCurrentUserClient() {
  try {
    const res = await fetch("/api/auth/user");
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Clean up expired sessions from the database
 * This should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await db.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    console.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  } catch (error) {
    console.error("Failed to cleanup expired sessions:", error);
    return 0;
  }
}

