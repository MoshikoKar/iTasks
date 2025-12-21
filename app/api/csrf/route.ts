import { NextResponse } from "next/server";
import { setCSRFToken } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * Get CSRF token for forms
 * This endpoint sets the CSRF token cookies and returns the token
 */
export async function GET() {
  try {
    const token = await setCSRFToken();
    return NextResponse.json({ csrf_token: token });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 });
  }
}