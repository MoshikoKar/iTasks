import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";

/**
 * Helper function to build task query filters based on user role (RBAC)
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

/**
 * Helper function to build audit log filter based on user role (RBAC)
 */
function buildAuditLogFilter(user: { id: string; role: Role; teamId: string | null }) {
  switch (user.role) {
    case Role.Admin:
      return {};

    case Role.TeamLead:
      if (user.teamId) {
        return {
          OR: [
            { task: { assignee: { teamId: user.teamId } } },
            { task: { assigneeId: user.id } },
            { task: { creatorId: user.id } },
          ],
        };
      }
      return {
        OR: [
          { task: { assigneeId: user.id } },
          { task: { creatorId: user.id } },
        ],
      };

    case Role.Technician:
    case Role.Viewer:
    default:
      return {
        OR: [
          { task: { assigneeId: user.id } },
          { task: { creatorId: user.id } },
        ],
      };
  }
}

export async function getDashboardStats(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Get current user with role and teamId
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, teamId: true },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const taskFilter = buildTaskFilter(currentUser);

  // Top stat cards with RBAC - Parallelized for performance
  const [open, overdue, slaBreaches, critical] = await Promise.all([
    db.task.count({
      where: { ...taskFilter, status: TaskStatus.Open },
    }),
    db.task.count({
      where: {
        ...taskFilter,
        dueDate: { lt: now },
        status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
      },
    }),
    db.task.count({
      where: {
        ...taskFilter,
        slaDeadline: { lt: now },
        status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
      },
    }),
    db.task.count({
      where: { ...taskFilter, priority: TaskPriority.Critical },
    }),
  ]);

  // My Day - Always personal (user's own tasks)
  const myDay = await db.task.findMany({
    where: {
      assigneeId: userId,
      OR: [
        { dueDate: { gte: startOfDay, lte: endOfDay } },
        { dueDate: { lt: now }, status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
      ],
    },
    orderBy: { dueDate: "asc" },
    take: 7,
    include: { assignee: true, context: true },
  });

  // My Open Tasks - Always personal (user's own tasks)
  const myOpenTasks = await db.task.findMany({
    where: {
      assigneeId: userId,
      status: TaskStatus.Open,
    },
    include: { assignee: true, context: true },
  });

  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sortedMyOpenTasks = myOpenTasks.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (!a.slaDeadline && !b.slaDeadline) return 0;
    if (!a.slaDeadline) return 1;
    if (!b.slaDeadline) return -1;

    return a.slaDeadline.getTime() - b.slaDeadline.getTime();
  });

  // Weekly Ticket Volume (last 7 days) with RBAC
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weeklyTasks = await db.task.findMany({
    where: {
      ...taskFilter,
      createdAt: { gte: sevenDaysAgo },
    },
    select: { createdAt: true },
  });

  const weeklyVolume = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(date.getDate() + i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const count = weeklyTasks.filter(
      (t) => t.createdAt >= dayStart && t.createdAt <= dayEnd
    ).length;

    return {
      date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    };
  });

  // Tasks by Priority Distribution with RBAC - Optimized with groupBy
  const priorityDistributionRaw = await db.task.groupBy({
    by: ['priority'],
    where: {
      ...taskFilter,
      status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
    },
    _count: { priority: true },
  });

  const priorityDistribution = Object.values(TaskPriority).map(priority => {
    const found = priorityDistributionRaw.find(p => p.priority === priority);
    return { priority, count: found?._count.priority || 0 };
  });

  // Tasks by Branch Distribution with RBAC
  const allBranches = await db.task.findMany({
    where: {
      ...taskFilter,
      branch: { not: null },
      status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
    },
    select: { branch: true },
  });

  const branchCounts = allBranches.reduce((acc, task) => {
    if (task.branch) {
      acc[task.branch] = (acc[task.branch] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const branchDistribution = Object.entries(branchCounts).map(([branch, count]) => ({
    branch,
    count,
  })).sort((a, b) => b.count - a.count);

  // Stale Tasks (no updates > 7 days) with RBAC
  const staleTasks = await db.task.findMany({
    where: {
      ...taskFilter,
      updatedAt: { lt: sevenDaysAgo },
      status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
    },
    orderBy: { updatedAt: "asc" },
    take: 10,
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  // Recent Activity (Audit Logs) with RBAC
  const auditLogFilter = buildAuditLogFilter(currentUser);
  const recentActivity = await db.auditLog.findMany({
    where: auditLogFilter,
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      actor: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  });

  return {
    open,
    overdue,
    slaBreaches,
    critical,
    myDay,
    myOpenTasks: sortedMyOpenTasks,
    weeklyVolume,
    priorityDistribution,
    branchDistribution,
    staleTasks,
    recentActivity,
  };
}
