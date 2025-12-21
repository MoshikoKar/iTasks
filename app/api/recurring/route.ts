import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskPriority, Role } from "@prisma/client";
import parser from "cron-parser";
import { requireAuth } from "@/lib/auth";
import { logRecurringTaskCreated } from "@/lib/logging/system-logger";
import { createRecurringTaskSchema } from "@/lib/validation/recurringTaskSchema";
import { logger } from "@/lib/logger";
import { validateCSRFHeader } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFHeader(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const currentUser = await requireAuth();
    const body = await request.json();

    // SECURITY: Validate input with Zod schema
    const validationResult = createRecurringTaskSchema.safeParse({
      name: body.name,
      description: body.templateDescription || body.description || "",
      cron: body.cron,
      priority: body.templatePriority || body.priority,
      type: body.type,
      branch: body.templateBranch || body.branch,
      assigneeId: body.templateAssigneeId || body.assigneeId,
      tags: body.tags,
      enabled: body.enabled !== false,
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

    // Enforce assignment rules
    // Regular users can only assign to themselves
    // Admin/TeamLead can assign to users below them
    if (currentUserWithTeam.role === Role.Technician || currentUserWithTeam.role === Role.Viewer) {
      if (validatedData.assigneeId !== currentUserWithTeam.id) {
        return NextResponse.json(
          { error: "You can only assign recurring tasks to yourself" },
          { status: 403 }
        );
      }
    } else if (currentUserWithTeam.role === Role.TeamLead) {
      // TeamLead can assign to themselves or users in their team (but not admin)
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
    // Admin can assign to anyone

    const config = await db.recurringTaskConfig.create({
      data: {
        name: validatedData.name,
        cron: validatedData.cron,
        templateTitle: body.templateTitle || validatedData.name, // Use name as title if not provided
        templateDescription: validatedData.description || null,
        templatePriority: validatedData.priority,
        templateAssigneeId: validatedData.assigneeId,
        creatorId: currentUserWithTeam.id,
        templateBranch: validatedData.branch || null,
        templateServerName: body.templateServerName || null,
        templateApplication: body.templateApplication || null,
        templateIpAddress: body.templateIpAddress || null,
        nextGenerationAt: computeNextGeneration(validatedData.cron),
      },
    });

    // Log recurring task creation
    await logRecurringTaskCreated(
      config.id,
      config.name,
      currentUserWithTeam.id,
      {
        cron: config.cron,
        priority: config.templatePriority,
        assigneeId: config.templateAssigneeId,
      }
    );

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    logger.error("Error creating recurring task config", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create recurring task config" },
      { status: 500 }
    );
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
