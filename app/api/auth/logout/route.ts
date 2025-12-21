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

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "strict",
      secure: true, // Always secure
      path: "/",
      maxAge: 0
    });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear the cookie even if database operation fails
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      maxAge: 0
    });
    return response;
  }
}
