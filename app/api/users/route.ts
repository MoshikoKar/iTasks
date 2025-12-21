import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import crypto from "crypto";
import { logUserCreated } from "@/lib/logging/system-logger";
import { logger } from "@/lib/logger";
import { createUserSchema } from "@/lib/validation/userSchema";
import { validateCSRFHeader } from "@/lib/csrf";

export const runtime = "nodejs";

const PBKDF2_ITERATIONS = 310000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // Only Admin can list all users
    if (currentUser.role !== Role.Admin) {
      return NextResponse.json(
        { error: "Unauthorized: Only Admins can view all users" },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    logger.error("Error fetching users", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFHeader(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const currentUser = await requireAuth();

    // Only Admin can create users
    if (currentUser.role !== Role.Admin) {
      return NextResponse.json(
        { error: "Unauthorized: Only Admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map(issue => issue.message)
        .join(", ");
      return NextResponse.json(
        { error: `Validation failed: ${errorMessages}` },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Validate team if provided
    if (validatedData.teamId) {
      const team = await db.team.findUnique({
        where: { id: validatedData.teamId },
      });

      if (!team) {
        return NextResponse.json(
          { error: "Invalid team ID" },
          { status: 400 }
        );
      }
    }

    // Check if this is the first user in the system
    const userCount = await db.user.count();
    const isFirstUser = userCount === 0;

    // Create user
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        role: isFirstUser ? Role.Admin : validatedData.role, // First user is always Admin
        passwordHash: hashPassword(validatedData.password),
        teamId: validatedData.teamId || null,
        authProvider: 'local',
        isBootstrapAdmin: isFirstUser, // Mark first user as bootstrap admin
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log user creation
    await logUserCreated(
      user.id,
      user.name,
      user.email,
      currentUser.id,
      user.role,
      user.teamId,
      user.team?.name || null
    );

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        team: user.team,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error creating user", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
