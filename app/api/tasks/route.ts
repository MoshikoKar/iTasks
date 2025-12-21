import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createTask } from "@/app/actions/tasks";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import { apiRateLimiter } from "@/lib/rate-limit";
import { validateCSRFHeader } from "@/lib/csrf";

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

async function getTasksHandler(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateLimitResult = apiRateLimiter.check(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const currentUser = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const assigneeId = searchParams.get("assigneeId");
    const cursor = searchParams.get("cursor");
    const limit = searchParams.get("limit");

    // Build RBAC filter
    const rbacFilter = buildTaskFilter(currentUser);

    // If assigneeId is provided, combine with RBAC filter
    const where = assigneeId
      ? { AND: [rbacFilter, { assigneeId }] }
      : rbacFilter;

    // Check if pagination parameters are provided
    const usePagination = cursor !== null || limit !== null;

    if (usePagination) {
      // Use cursor-based pagination
      const limitNum = Math.min(parseInt(limit || "50"), 100); // Max 100 items per page

      const tasks = await db.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true } },
          context: { select: { serverName: true, application: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limitNum + 1, // Take one extra to check if there's a next page
        ...(cursor && { cursor: { id: cursor }, skip: 1 }), // Skip the cursor itself
      });

      const hasNextPage = tasks.length > limitNum;
      const tasksToReturn = hasNextPage ? tasks.slice(0, -1) : tasks;
      const nextCursor = hasNextPage ? tasksToReturn[tasksToReturn.length - 1]?.id : null;

      return NextResponse.json({
        tasks: tasksToReturn,
        pagination: {
          hasNextPage,
          nextCursor,
          limit: limitNum,
        },
      });
    } else {
      // Backward compatibility: return all tasks as array
      const tasks = await db.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true } },
          context: { select: { serverName: true, application: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(tasks);
    }
  } catch (error) {
    logger.error("Error fetching tasks", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tasks" },
      { status: error instanceof Error && error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

async function createTaskHandler(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('x-client-ip') ||
                     'unknown';
    const rateLimitResult = apiRateLimiter.check(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFHeader(request);
    if (!isValidCSRF) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const currentUser = await requireAuth();
    const body = await request.json();

    // Fetch current user with teamId and role
    const currentUserWithTeam = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, role: true, teamId: true },
    });

    if (!currentUserWithTeam) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Enforce assignment rules - no one can assign tasks to users above their permission level
    if (body.assigneeId && body.assigneeId !== currentUserWithTeam.id) {
      const assignee = await db.user.findUnique({
        where: { id: body.assigneeId },
        select: { role: true, teamId: true },
      });

      if (!assignee) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
      }

      // Check permission hierarchy: Admin > TeamLead > Technician/Viewer
      const roleHierarchy = { Admin: 3, TeamLead: 2, Technician: 1, Viewer: 1 };
      const currentUserLevel = roleHierarchy[currentUserWithTeam.role];
      const assigneeLevel = roleHierarchy[assignee.role];

      // Cannot assign to users with higher or equal permission level (except self)
      if (assigneeLevel >= currentUserLevel) {
        return NextResponse.json(
          { error: "You cannot assign tasks to users with equal or higher permission level" },
          { status: 403 }
        );
      }

      // TeamLead can only assign to users in their team (or themselves)
      if (currentUserWithTeam.role === Role.TeamLead) {
        if (currentUserWithTeam.teamId && assignee.teamId !== currentUserWithTeam.teamId) {
          return NextResponse.json(
            { error: "You can only assign tasks to users in your team" },
            { status: 403 }
          );
        }
      }

      // Technician/Viewer can only assign to themselves
      if (currentUserWithTeam.role === Role.Technician || currentUserWithTeam.role === Role.Viewer) {
        return NextResponse.json(
          { error: "You can only assign tasks to yourself" },
          { status: 403 }
        );
      }
    }

    // SECURITY: Remove creatorId from body - it will be set from authenticated user in createTask
    const { creatorId, ...taskData } = body;
    const task = await createTask({
      ...taskData,
      // creatorId is now derived from authenticated user in createTask
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    logger.error("Error creating task", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 500 }
    );
  }
}

export const GET = getTasksHandler;
export const POST = createTaskHandler;

