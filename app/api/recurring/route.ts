import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskPriority, Role } from "@prisma/client";
import parser from "cron-parser";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

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
      if (body.templateAssigneeId !== currentUserWithTeam.id) {
        return NextResponse.json(
          { error: "You can only assign recurring tasks to yourself" },
          { status: 403 }
        );
      }
    } else if (currentUserWithTeam.role === Role.TeamLead) {
      // TeamLead can assign to themselves or users in their team (but not admin)
      if (body.templateAssigneeId !== currentUserWithTeam.id) {
        const assignee = await db.user.findUnique({
          where: { id: body.templateAssigneeId },
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
        name: body.name,
        cron: body.cron,
        templateTitle: body.templateTitle,
        templateDescription: body.templateDescription || null,
        templatePriority: body.templatePriority as TaskPriority,
        templateAssigneeId: body.templateAssigneeId,
        creatorId: currentUserWithTeam.id,
        templateBranch: body.templateBranch || null,
        templateServerName: body.templateServerName || null,
        templateApplication: body.templateApplication || null,
        templateIpAddress: body.templateIpAddress || null,
        nextGenerationAt: computeNextGeneration(body.cron),
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Error creating recurring task config:", error);
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
      tz: 'UTC',
      currentDate: new Date(),
    });
    return interval.next().toDate();
  } catch (error) {
    console.error(`Invalid cron expression "${cron}", falling back to 24h offset:`, error);
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}
