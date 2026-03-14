/**
 * Bootstrap detection: determines whether the app is in "bootstrap mode" (no admin users).
 * Used by middleware and layout to decide routing and UI. Result is cached in memory
 * with a short TTL to avoid a DB count on every request.
 */

import { db } from "@/lib/db";

/** Default TTL in ms; override with BOOTSTRAP_CACHE_TTL_MS (e.g. 60000 = 60s). */
const DEFAULT_TTL_MS = 60 * 1000;

interface CacheEntry {
  needsBootstrap: boolean;
  expiresAt: number;
}

let cached: CacheEntry | null = null;

function getTtlMs(): number {
  const env = process.env.BOOTSTRAP_CACHE_TTL_MS;
  if (env != null && env !== "") {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_TTL_MS;
}

/**
 * When true, bootstrap check is skipped and the system is treated as already
 * bootstrapped (no redirect to /bootstrap). Use in production when the first
 * admin has already been created and you want to avoid any per-request check.
 */
function isBootstrapCheckSkipped(): boolean {
  const v = process.env.SKIP_BOOTSTRAP_CHECK;
  return v === "true" || v === "1" || v === "yes";
}

/**
 * Returns whether the application is in bootstrap mode (no admin users exist).
 * Result is cached in memory for a short TTL. On DB error, returns true (fail-safe).
 *
 * @param options.forceRefresh - If true, bypass cache and hit the database (e.g. before creating the first admin).
 */
export async function getNeedsBootstrap(options?: { forceRefresh?: boolean }): Promise<boolean> {
  if (isBootstrapCheckSkipped()) {
    return false;
  }

  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();
  if (!forceRefresh && cached != null && now < cached.expiresAt) {
    return cached.needsBootstrap;
  }

  try {
    const adminCount = await db.user.count({
      where: { role: "Admin" },
    });
    const needsBootstrap = adminCount === 0;
    cached = {
      needsBootstrap,
      expiresAt: now + getTtlMs(),
    };
    return needsBootstrap;
  } catch {
    cached = {
      needsBootstrap: true,
      expiresAt: now + getTtlMs(),
    };
    return true;
  }
}

/**
 * Invalidates the cached bootstrap result. Call this after creating the first
 * admin (e.g. in POST /api/bootstrap) so the next request sees the updated state.
 */
export function invalidateBootstrapCache(): void {
  cached = null;
}
