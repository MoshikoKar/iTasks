import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import crypto from "crypto";
import { logUserCreated } from "@/lib/logging/system-logger";
import { logger } from "@/lib/logger";
import { createUserSchema } from "@/lib/validation/userSchema";
import { validatePassword } from "@/lib/constants";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if any admin users already exist
    const adminCount = await db.user.count({
      where: { role: Role.Admin },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Bootstrap registration is only available when no admin users exist" },
        { status: 403 }
      );
    }

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

    // Validate password against system policy (strong for bootstrap admin)
    const passwordValidation = validatePassword(validatedData.password, 'strong');
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}` },
        { status: 400 }
      );
    }

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

    // Extract first name from full name for display purposes
    const getFirstName = (fullName: string) => {
      return fullName.trim().split(' ')[0];
    };

    const displayName = getFirstName(validatedData.name);

    // Create the bootstrap admin user
    const user = await db.user.create({
      data: {
        name: displayName,
        email: validatedData.email,
        role: Role.Admin,
        passwordHash: hashPassword(validatedData.password),
        teamId: null, // Bootstrap admin has no team initially
        authProvider: 'local',
        isBootstrapAdmin: true, // Mark as bootstrap admin
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Log user creation
    await logUserCreated(
      user.id,
      user.name,
      user.email,
      user.id, // Bootstrap admin creates themselves
      user.role,
      null, // No team initially
      null // No team name
    );

    return NextResponse.json(
      {
        message: "Bootstrap admin created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Bootstrap registration error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bootstrap registration failed" },
      { status: 500 }
    );
  }
}
