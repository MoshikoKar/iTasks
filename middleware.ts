import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/constants";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/user"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|gif|svg)).*)"],
};
