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
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  return db.user.findUnique({ where: { id: session } });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
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

