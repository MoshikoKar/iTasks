import { NextRequest, NextResponse } from "next/server";
import { approveAssignmentRequest, rejectAssignmentRequest } from "@/app/actions/tasks";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { apiRateLimiter } from "@/lib/rate-limit";
import { validateCSRFHeader } from "@/lib/csrf";

export const runtime = "nodejs";

async function approveHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateLimitResult = apiRateLimiter.check(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFHeader(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    await requireAuth();
    const task = await approveAssignmentRequest(params.id);
    return NextResponse.json(task);
  } catch (error) {
    logger.error("Error approving assignment request", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve assignment request" },
      { status: 500 }
    );
  }
}

async function rejectHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateLimitResult = apiRateLimiter.check(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFHeader(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    await requireAuth();
    const task = await rejectAssignmentRequest(params.id);
    return NextResponse.json(task);
  } catch (error) {
    logger.error("Error rejecting assignment request", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject assignment request" },
      { status: 500 }
    );
  }
}

export const POST = async (request: NextRequest, context: { params: { id: string } }) => {
  const body = await request.json();
  const { action } = body;

  if (action === 'approve') {
    return approveHandler(request, context);
  } else if (action === 'reject') {
    return rejectHandler(request, context);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
};
