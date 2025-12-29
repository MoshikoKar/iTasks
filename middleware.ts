import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/constants";
import { db } from "./lib/db";

export const runtime = "nodejs";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/user", "/api/branding"];
const BOOTSTRAP_PATHS = ["/bootstrap", "/api/bootstrap"];

function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy - strict policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "media-src 'none'; " +
    "object-src 'none'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // HTTP Strict Transport Security
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy (formerly Feature-Policy)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Cross-Origin Opener Policy
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isBootstrap = BOOTSTRAP_PATHS.some((path) => pathname.startsWith(path));

  let response: NextResponse;

  // Check if bootstrap is needed
  let needsBootstrap = false;
  try {
    const adminCount = await db.user.count({
      where: { role: "Admin" },
    });
    needsBootstrap = adminCount === 0;
  } catch (error) {
    // If database is not available, allow access to bootstrap (fail-safe)
    needsBootstrap = true;
  }

  if (needsBootstrap) {
    // Bootstrap mode: only allow bootstrap paths and branding
    if (isBootstrap || pathname.startsWith("/api/branding") || pathname === "/") {
      response = NextResponse.next();
    } else {
      // Redirect to bootstrap page
      const bootstrapUrl = new URL("/bootstrap", request.url);
      response = NextResponse.redirect(bootstrapUrl);
    }
  } else if (isPublic || isBootstrap) {
    // Normal mode: allow public paths
    response = NextResponse.next();
  } else {
    // Normal authentication check
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    if (!session) {
      if (pathname.startsWith("/api")) {
        response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      } else {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        response = NextResponse.redirect(loginUrl);
      }
    } else {
      response = NextResponse.next();
    }
  }

  // Add security headers to all responses
  addSecurityHeaders(response);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|gif|svg)).*)"],
};
