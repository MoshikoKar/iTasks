import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import { cache, cacheKeys, CACHE_TTL } from "@/lib/cache";

/**
 * Clear dashboard cache for a specific user
 */
export function clearDashboardCache(userId: string) {
  const cacheKey = cacheKeys.dashboardStats(userId);
  cache.delete(cacheKey);
}

/**
 * Clear dashboard cache for all users in a team (when team data changes)
 */
export async function clearTeamDashboardCache(teamId: string) {
  // Find all users in the team and clear their cache
  const teamUsers = await db.user.findMany({
    where: { teamId },
    select: { id: true },
  });

  for (const user of teamUsers) {
    clearDashboardCache(user.id);
  }
}

/**
 * Helper function to build task query filters based on user role (RBAC)
 * For dashboard summary cards and analytics, users see their team's tasks
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
      // Technician/Viewer sees tasks from their team (for dashboard summaries and analytics)
      if (user.teamId) {
        return {
          assignee: { teamId: user.teamId },
        };
      }
      // If no team, fall back to their own tasks
      return {
        OR: [{ assigneeId: user.id }, { creatorId: user.id }],
      };
  }
}


export async function getDashboardStats(userId: string, forceRefresh: boolean = false) {
  // Check cache first (unless force refresh is requested)
  const cacheKey = cacheKeys.dashboardStats(userId);
  if (!forceRefresh) {
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }
  }

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
      where: { ...taskFilter, status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
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
  // Shows: tasks due today, overdue tasks, or open tasks with no due date
  const myDay = await db.task.findMany({
    where: {
      assigneeId: userId,
      status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
      OR: [
        { dueDate: { gte: startOfDay, lte: endOfDay } },
        { dueDate: { lt: now } },
        { dueDate: null },
      ],
    },
    orderBy: { dueDate: "asc" },
    take: 7,
    include: { assignee: true, context: true },
  });

  // My Open Tasks - Always personal (user's own tasks)
  // Include all tasks that are not resolved or closed (Open, InProgress, PendingVendor, PendingUser)
  const myOpenTasks = await db.task.findMany({
    where: {
      assigneeId: userId,
      status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
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
      date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Jerusalem" }),
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

  // Tasks by Branch Distribution with RBAC - Optimized with groupBy
  const branchDistributionRaw = await db.task.groupBy({
    by: ['branch'],
    where: {
      ...taskFilter,
      branch: { not: null },
      status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
    },
    _count: { branch: true },
  });

  const branchDistribution = branchDistributionRaw
    .filter((item) => item.branch !== null)
    .map((item) => ({
      branch: item.branch!,
      count: item._count.branch,
    }))
    .sort((a, b) => b.count - a.count);

  // Tasks per User/Technician Distribution with RBAC
  const tasksPerUser = await db.task.groupBy({
    by: ['assigneeId'],
    where: {
      ...taskFilter,
      status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] },
    },
    _count: { assigneeId: true },
  });

  const userIds = tasksPerUser
    .map(t => t.assigneeId)
    .filter((id): id is string => id !== null);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const userMap = new Map(users.map(u => [u.id, u.name]));
  const userDistribution = tasksPerUser
    .filter(({ assigneeId }) => assigneeId !== null)
    .map(({ assigneeId, _count }) => ({
      user: userMap.get(assigneeId!) || 'Unassigned',
      count: _count.assigneeId,
    }))
    .sort((a, b) => b.count - a.count);

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

  const result = {
    open,
    overdue,
    slaBreaches,
    critical,
    myDay,
    myOpenTasks: sortedMyOpenTasks,
    weeklyVolume,
    priorityDistribution,
    branchDistribution,
    userDistribution,
    staleTasks,
  };

  // Cache the result
  cache.set(cacheKey, result, CACHE_TTL.DASHBOARD_STATS);

  return result;
}

