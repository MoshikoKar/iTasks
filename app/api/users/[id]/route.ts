import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import crypto from "crypto";
import {
  logUserUpdated,
  logUserDeleted,
  logPermissionChange,
} from "@/lib/logging/system-logger";
import { logger } from "@/lib/logger";
import { validateCSRFHeader } from "@/lib/csrf";
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFHeader(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

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

    // Protect bootstrap admin from permission changes
    if (existingUser.isBootstrapAdmin && body.role !== undefined && body.role !== Role.Admin) {
      return NextResponse.json(
        { error: "Bootstrap admin cannot have permissions lowered below Admin" },
        { status: 403 }
      );
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
      // Validate password against system policy
      const systemConfig = await db.systemConfig.findUnique({ where: { id: "system" } });
      const passwordPolicyLevel = systemConfig?.passwordPolicyLevel || 'strong';

      const passwordValidation = validatePassword(body.password, passwordPolicyLevel);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { error: `Password does not meet requirements: ${passwordValidation.errors.join(', ')}` },
          { status: 400 }
        );
      }

      updateData.passwordHash = hashPassword(body.password);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Track changes for logging
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (updateData.name !== undefined && existingUser.name !== updateData.name) {
      changes.name = { old: existingUser.name, new: updateData.name };
    }
    if (updateData.email !== undefined && existingUser.email !== updateData.email) {
      changes.email = { old: existingUser.email, new: updateData.email };
    }
    if (updateData.role !== undefined && existingUser.role !== updateData.role) {
      changes.role = { old: existingUser.role, new: updateData.role };
    }
    if (updateData.teamId !== undefined && existingUser.teamId !== updateData.teamId) {
      changes.teamId = { old: existingUser.teamId, new: updateData.teamId };
    }
    if (updateData.passwordHash !== undefined) {
      changes.password = { old: "[REDACTED]", new: "[CHANGED]" };
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: { team: { select: { id: true, name: true } } },
    });

    // Log specific changes
    if (updateData.role !== undefined && existingUser.role !== updateData.role) {
      await logPermissionChange(
        user.id,
        user.name,
        currentUser.id,
        existingUser.role,
        user.role
      );
    }

    // Log general user update (excluding role change which has its own log)
    const otherChanges: Record<string, { old: unknown; new: unknown }> = {};
    if (changes.name) otherChanges.name = changes.name;
    if (changes.email) otherChanges.email = changes.email;
    if (changes.teamId) otherChanges.teamId = changes.teamId;
    if (changes.password) otherChanges.password = changes.password;

    if (Object.keys(otherChanges).length > 0) {
      await logUserUpdated(
        user.id,
        user.name,
        currentUser.id,
        otherChanges,
        {
          teamName: user.team?.name,
        }
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      team: user.team,
    });
  } catch (error) {
    logger.error("Error updating user", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFHeader(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

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
      include: { 
        _count: { 
          select: { 
            tasksCreated: true, 
            tasksAssigned: true,
            subscribedTasks: true,
            recurringTemplates: true,
            recurringTasksCreated: true,
            comments: true,
            attachments: true,
            mentions: true,
            sessions: true,
            systemLogs: true,
            auditLogs: true,
          } 
        } 
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Protect bootstrap admin from deletion
    if (user.isBootstrapAdmin) {
      return NextResponse.json(
        { error: "Bootstrap admin cannot be deleted" },
        { status: 403 }
      );
    }

    // Check for tasks
    if (user._count.tasksCreated > 0 || user._count.tasksAssigned > 0) {
      return NextResponse.json({
        error: `Cannot delete user with ${user._count.tasksCreated} created and ${user._count.tasksAssigned} assigned tasks.`,
      }, { status: 400 });
    }

    // Delete recurring task configs where user is template assignee (required field, so we must delete the configs)
    if (user._count.recurringTemplates > 0) {
      await db.recurringTaskConfig.deleteMany({
        where: { templateAssigneeId: id },
      });
    }

    // Delete related records that don't prevent deletion
    if (user._count.subscribedTasks > 0) {
      // Remove user from task subscriptions (many-to-many, safe to remove)
      await db.user.update({
        where: { id },
        data: {
          subscribedTasks: {
            set: [],
          },
        },
      });
    }

    if (user._count.sessions > 0) {
      // Delete user sessions
      await db.session.deleteMany({
        where: { userId: id },
      });
    }

    if (user._count.recurringTasksCreated > 0) {
      // Delete recurring task configs created by this user (creatorId is nullable)
      await db.recurringTaskConfig.deleteMany({
        where: { creatorId: id },
      });
    }

    // Update system logs to reference the current admin (preserves audit trail)
    if (user._count.systemLogs > 0) {
      await db.systemLog.updateMany({
        where: { actorId: id },
        data: { actorId: currentUser.id },
      });
    }

    // Update audit logs to reference the current admin (preserves audit trail)
    if (user._count.auditLogs > 0) {
      await db.auditLog.updateMany({
        where: { actorId: id },
        data: { actorId: currentUser.id },
      });
    }

    // Handle comments, attachments, and mentions
    // These reference tasks, so if user has no tasks, these should be empty
    // But we'll handle them just in case to avoid foreign key issues
    if (user._count.comments > 0) {
      // Comments reference tasks, and we already check for tasks, but handle edge cases
      // We can't delete comments as they're historical, so we need to update the userId
      // But userId is required in Comment, so we need to reassign to current admin
      await db.comment.updateMany({
        where: { userId: id },
        data: { userId: currentUser.id },
      });
    }

    if (user._count.mentions > 0) {
      // Mentions reference comments, update to current admin
      await db.mention.updateMany({
        where: { userId: id },
        data: { userId: currentUser.id },
      });
    }

    if (user._count.attachments > 0) {
      // Attachments reference tasks, update uploadedBy to current admin
      await db.attachment.updateMany({
        where: { uploadedBy: id },
        data: { uploadedBy: currentUser.id },
      });
    }

    // Log user deletion before deleting
    await logUserDeleted(
      user.id,
      user.name,
      user.email,
      currentUser.id,
      {
        role: user.role,
        tasksCreated: user._count.tasksCreated,
        tasksAssigned: user._count.tasksAssigned,
        recurringTemplatesDeleted: user._count.recurringTemplates,
        recurringTasksCreatedDeleted: user._count.recurringTasksCreated,
        sessionsDeleted: user._count.sessions,
        subscriptionsRemoved: user._count.subscribedTasks,
        systemLogsReassigned: user._count.systemLogs,
        auditLogsReassigned: user._count.auditLogs,
      }
    );

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting user", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
