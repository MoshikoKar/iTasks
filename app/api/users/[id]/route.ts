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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;

    if (currentUser.role !== Role.Admin && currentUser.id !== id) {
      return NextResponse.json(
        { error: "Unauthorized: Only Admins can update other users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const existingUser = await db.user.findUnique({ where: { id } });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (currentUser.role === Role.Admin) {
      if (body.role !== undefined) {
        if (!Object.values(Role).includes(body.role)) {
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }
        updateData.role = body.role as Role;
      }

      if (body.teamId !== undefined) {
        if (body.teamId) {
          const team = await db.team.findUnique({ where: { id: body.teamId } });
          if (!team) {
            return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
          }
        }
        updateData.teamId = body.teamId || null;
      }
    }

    if (body.name !== undefined) updateData.name = body.name;

    if (body.email !== undefined && currentUser.role === Role.Admin) {
      if (body.email !== existingUser.email) {
        const emailExists = await db.user.findUnique({ where: { email: body.email } });
        if (emailExists) {
          return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }
      }
      updateData.email = body.email;
    }

    if (body.password !== undefined) {
      updateData.passwordHash = hashPassword(body.password);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { team: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      team: user.team,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;

    if (currentUser.role !== Role.Admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (currentUser.id === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id },
      include: { _count: { select: { tasksCreated: true, tasksAssigned: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user._count.tasksCreated > 0 || user._count.tasksAssigned > 0) {
      return NextResponse.json({
        error: `Cannot delete user with ${user._count.tasksCreated} created and ${user._count.tasksAssigned} assigned tasks.`,
      }, { status: 400 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
