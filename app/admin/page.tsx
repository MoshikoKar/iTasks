import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageWrapper } from "@/components/admin-page-wrapper";

export default async function AdminPage() {
  try {
    await requireRole([Role.Admin]);
  } catch (error) {
    redirect("/");
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      createdAt: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasksAssigned: true,
          tasksCreated: true,
        },
      },
    },
  });

  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  const stats = await db.user.groupBy({
    by: ["role"],
    _count: true,
  });

  const auditLogs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: true, task: true },
  });

  const systemLogs = await db.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: true, task: true },
  });

  // Helper function to get concise action from actionType
  const getConciseAction = (actionType: string | null | undefined): string => {
    if (!actionType) return 'unknown';
    // Convert enum values like "StatusChange" to "statuschange" or keep simple ones like "Create" -> "create"
    return actionType.toLowerCase();
  };

  // Combine and sort by date (most recent first)
  const recentActivity = [
    ...auditLogs.map(log => ({
      id: log.id,
      type: 'audit' as const,
      action: log.action, // Already concise (e.g., "create", "update")
      description: undefined, // Audit logs don't have separate descriptions
      createdAt: log.createdAt,
      actor: log.actor,
      task: log.task,
    })),
    ...systemLogs.map(log => ({
      id: log.id,
      type: 'system' as const,
      action: getConciseAction(log.actionType), // Concise action from actionType
      description: log.description, // Full description
      actionType: log.actionType,
      entityType: log.entityType,
      createdAt: log.createdAt,
      actor: log.actor,
      task: log.task || (log.taskTitle ? { id: log.taskId || null, title: log.taskTitle } : null),
      taskTitle: log.taskTitle,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);

  return <AdminPageWrapper users={users} teams={teams} stats={stats} recentActivity={recentActivity} />;
}

