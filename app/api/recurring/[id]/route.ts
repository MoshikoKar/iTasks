import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskPriority, Role } from "@prisma/client";
import parser from "cron-parser";
import { requireAuth } from "@/lib/auth";
import {
  logRecurringTaskUpdated,
  logRecurringTaskDeleted,
} from "@/lib/logging/system-logger";
import { updateRecurringTaskSchema } from "@/lib/validation/recurringTaskSchema";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await db.recurringTaskConfig.findUnique({
      where: { id },
      include: {
        templateAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    logger.error("Error fetching recurring task config", error);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();
    const { id } = await params;

    // SECURITY: Validate input with Zod schema
    const validationResult = updateRecurringTaskSchema.safeParse({
      name: body.name,
      description: body.templateDescription || body.description,
      cron: body.cron,
      priority: body.templatePriority || body.priority,
      type: body.type,
      branch: body.templateBranch || body.branch,
      assigneeId: body.templateAssigneeId || body.assigneeId,
      tags: body.tags,
      enabled: body.enabled,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validationResult.error.errors.map(e => e.message).join(", ")}` },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Fetch current user with teamId
    const currentUserWithTeam = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, role: true, teamId: true },
    });

    if (!currentUserWithTeam) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if config exists and user has permission to edit
    const existingConfig = await db.recurringTaskConfig.findUnique({
      where: { id },
      select: {
        creatorId: true,
        name: true,
        cron: true,
        templateTitle: true,
        templateDescription: true,
        templatePriority: true,
        templateAssigneeId: true,
        templateBranch: true,
        templateServerName: true,
        templateApplication: true,
        templateIpAddress: true,
      },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // Only creator, admin, or team lead can edit
    if (existingConfig.creatorId !== currentUserWithTeam.id && currentUserWithTeam.role !== Role.Admin && currentUserWithTeam.role !== Role.TeamLead) {
      return NextResponse.json({ error: "You don't have permission to edit this configuration" }, { status: 403 });
    }

    // Enforce assignment rules (same as POST)
    if (validatedData.assigneeId !== undefined) {
      if (currentUserWithTeam.role === Role.Technician || currentUserWithTeam.role === Role.Viewer) {
        if (validatedData.assigneeId !== currentUserWithTeam.id) {
          return NextResponse.json(
            { error: "You can only assign recurring tasks to yourself" },
            { status: 403 }
          );
        }
      } else if (currentUserWithTeam.role === Role.TeamLead) {
        if (validatedData.assigneeId !== currentUserWithTeam.id) {
          const assignee = await db.user.findUnique({
            where: { id: validatedData.assigneeId },
            select: { role: true, teamId: true },
          });
          if (!assignee) {
            return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
          }
          if (assignee.role === Role.Admin) {
            return NextResponse.json(
              { error: "You cannot assign recurring tasks to admins" },
              { status: 403 }
            );
          }
          if (currentUserWithTeam.teamId && assignee.teamId !== currentUserWithTeam.teamId) {
            return NextResponse.json(
              { error: "You can only assign recurring tasks to users in your team" },
              { status: 403 }
            );
          }
        }
      }
    }

    // Build update data from validated input
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.cron !== undefined) {
      updateData.cron = validatedData.cron;
      updateData.nextGenerationAt = computeNextGeneration(validatedData.cron);
    }
    if (validatedData.description !== undefined) updateData.templateDescription = validatedData.description;
    if (validatedData.priority !== undefined) updateData.templatePriority = validatedData.priority;
    if (validatedData.assigneeId !== undefined) updateData.templateAssigneeId = validatedData.assigneeId;
    if (validatedData.branch !== undefined) updateData.templateBranch = validatedData.branch;
    
    // Handle templateTitle separately (not in schema but may be in body)
    if (body.templateTitle !== undefined) updateData.templateTitle = body.templateTitle;
    if (body.templateServerName !== undefined) updateData.templateServerName = body.templateServerName;
    if (body.templateApplication !== undefined) updateData.templateApplication = body.templateApplication;
    if (body.templateIpAddress !== undefined) updateData.templateIpAddress = body.templateIpAddress;

    const config = await db.recurringTaskConfig.update({
      where: { id },
      data: updateData,
    });

    // Track changes for logging
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (validatedData.name !== undefined && existingConfig.name !== config.name) {
      changes.name = { old: existingConfig.name, new: config.name };
    }
    if (validatedData.cron !== undefined && existingConfig.cron !== config.cron) {
      changes.cron = { old: existingConfig.cron, new: config.cron };
    }
    if (body.templateTitle !== undefined && existingConfig.templateTitle !== config.templateTitle) {
      changes.templateTitle = { old: existingConfig.templateTitle, new: config.templateTitle };
    }
    if (validatedData.priority !== undefined && existingConfig.templatePriority !== config.templatePriority) {
      changes.templatePriority = { old: existingConfig.templatePriority, new: config.templatePriority };
    }
    if (validatedData.assigneeId !== undefined && existingConfig.templateAssigneeId !== config.templateAssigneeId) {
      changes.templateAssigneeId = { old: existingConfig.templateAssigneeId, new: config.templateAssigneeId };
    }

    // Log recurring task update
    if (Object.keys(changes).length > 0) {
      await logRecurringTaskUpdated(
        config.id,
        config.name,
        currentUserWithTeam.id,
        changes
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    logger.error("Error updating recurring task config", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update configuration" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;

    // Check if config exists and user has permission to delete
    const existingConfig = await db.recurringTaskConfig.findUnique({
      where: { id },
      select: { creatorId: true, name: true },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // Only creator, admin, or team lead can delete
    if (existingConfig.creatorId !== currentUser.id && currentUser.role !== Role.Admin && currentUser.role !== Role.TeamLead) {
      return NextResponse.json({ error: "You don't have permission to delete this configuration" }, { status: 403 });
    }

    // Log deletion before deleting
    await logRecurringTaskDeleted(
      id,
      existingConfig.name,
      currentUser.id
    );

    await db.recurringTaskConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting recurring task config", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete configuration" }, { status: 500 });
  }
}

function computeNextGeneration(cron: string): Date {
  try {
    const interval = parser.parse(cron, {
      tz: 'Asia/Jerusalem',
      currentDate: new Date(),
    });
    return interval.next().toDate();
  } catch (error) {
    logger.error(`Invalid cron expression "${cron}", falling back to 24h offset`, error);
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}
