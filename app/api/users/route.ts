import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import crypto from "crypto";

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
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    // Only Admin can create users
    if (currentUser.role !== Role.Admin) {
      return NextResponse.json(
        { error: "Unauthorized: Only Admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.password || !body.role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(Role).includes(body.role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Validate team if provided
    if (body.teamId) {
      const team = await db.team.findUnique({
        where: { id: body.teamId },
      });

      if (!team) {
        return NextResponse.json(
          { error: "Invalid team ID" },
          { status: 400 }
        );
      }
    }

    // Create user
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role as Role,
        passwordHash: hashPassword(body.password),
        teamId: body.teamId || null,
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
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
