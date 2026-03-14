import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, getCookieOptions } from "./lib/constants";
import { validateSessionToken } from "./lib/auth";
import { addSecurityHeaders } from "./lib/security-headers";
import { getNeedsBootstrap } from "./lib/bootstrap";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/user", "/api/branding"];
const BOOTSTRAP_PATHS = ["/bootstrap", "/api/bootstrap"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isBootstrap = BOOTSTRAP_PATHS.some((path) => pathname.startsWith(path));

  let response: NextResponse;

  const needsBootstrap = await getNeedsBootstrap();

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
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await validateSessionToken(sessionToken);

    if (!session) {
      if (pathname.startsWith("/api")) {
        response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        response.cookies.set(SESSION_COOKIE, "", {
          ...getCookieOptions(),
          maxAge: 0,
        });
      } else {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        response = NextResponse.redirect(loginUrl);
        response.cookies.set(SESSION_COOKIE, "", {
          ...getCookieOptions(),
          maxAge: 0,
        });
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
