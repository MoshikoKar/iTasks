import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createTask } from "@/app/actions/tasks";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";

export const runtime = "nodejs";

/**
 * Build task filter based on user role (RBAC)
 */
function buildTaskFilter(user: { id: string; role: Role; teamId: string | null }) {
  switch (user.role) {
    case Role.Admin:
      // Admin sees ALL tasks
      return {};

    case Role.TeamLead:
      // TeamLead sees tasks where assignee is in their team OR tasks they created/are assigned to
      if (user.teamId) {
        return {
          OR: [
            { assignee: { teamId: user.teamId } },
            { assigneeId: user.id },
            { creatorId: user.id },
          ],
        };
      }
      // If TeamLead has no team, fall back to their own tasks
      return {
        OR: [{ assigneeId: user.id }, { creatorId: user.id }],
      };

    case Role.Technician:
    case Role.Viewer:
    default:
      // Technician/Viewer sees only tasks assigned to them or created by them
      return {
        OR: [{ assigneeId: user.id }, { creatorId: user.id }],
      };
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const assigneeId = searchParams.get("assigneeId");

    // Build RBAC filter
    const rbacFilter = buildTaskFilter(currentUser);

    // If assigneeId is provided, combine with RBAC filter
    const where = assigneeId
      ? { AND: [rbacFilter, { assigneeId }] }
      : rbacFilter;

    const tasks = await db.task.findMany({
      where,
      include: {
        assignee: { select: { name: true } },
        context: { select: { serverName: true, application: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tasks" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = await createTask(body);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 500 }
    );
  }
}

