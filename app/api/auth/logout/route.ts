import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    // Get current session token and delete it from database
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (sessionToken) {
      await db.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    // In development, use lax sameSite and allow insecure cookies for local network access
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: isDevelopment ? "lax" : "strict", // lax allows cross-site requests in dev
      secure: !isDevelopment, // Allow insecure cookies in development for local network
      path: "/",
      maxAge: 0
    });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear the cookie even if database operation fails
    const isDevelopment = process.env.NODE_ENV === 'development';
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: isDevelopment ? "lax" : "strict", // lax allows cross-site requests in dev
      secure: !isDevelopment, // Allow insecure cookies in development for local network
      path: "/",
      maxAge: 0
    });
    return response;
  }
}
