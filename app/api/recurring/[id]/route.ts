import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TaskPriority, Role } from "@prisma/client";
import parser from "cron-parser";
import { requireAuth } from "@/lib/auth";

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
    console.error("Error fetching recurring task config:", error);
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
      select: { creatorId: true },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // Only creator, admin, or team lead can edit
    if (existingConfig.creatorId !== currentUserWithTeam.id && currentUserWithTeam.role !== Role.Admin && currentUserWithTeam.role !== Role.TeamLead) {
      return NextResponse.json({ error: "You don't have permission to edit this configuration" }, { status: 403 });
    }

    // Enforce assignment rules (same as POST)
    if (currentUserWithTeam.role === Role.Technician || currentUserWithTeam.role === Role.Viewer) {
      if (body.templateAssigneeId !== currentUserWithTeam.id) {
        return NextResponse.json(
          { error: "You can only assign recurring tasks to yourself" },
          { status: 403 }
        );
      }
    } else if (currentUserWithTeam.role === Role.TeamLead) {
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

    const config = await db.recurringTaskConfig.update({
      where: { id },
      data: {
        name: body.name,
        cron: body.cron,
        templateTitle: body.templateTitle,
        templateDescription: body.templateDescription || null,
        templatePriority: body.templatePriority as TaskPriority,
        templateAssigneeId: body.templateAssigneeId,
        templateBranch: body.templateBranch || null,
        templateServerName: body.templateServerName || null,
        templateApplication: body.templateApplication || null,
        templateIpAddress: body.templateIpAddress || null,
        nextGenerationAt: computeNextGeneration(body.cron),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating recurring task config:", error);
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
      select: { creatorId: true },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // Only creator, admin, or team lead can delete
    if (existingConfig.creatorId !== currentUser.id && currentUser.role !== Role.Admin && currentUser.role !== Role.TeamLead) {
      return NextResponse.json({ error: "You don't have permission to delete this configuration" }, { status: 403 });
    }

    await db.recurringTaskConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recurring task config:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete configuration" }, { status: 500 });
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
