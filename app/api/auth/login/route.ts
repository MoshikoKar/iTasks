import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(user.passwordHash, password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
