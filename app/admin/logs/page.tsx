import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLogsPage } from "@/components/admin-logs-page";

export default async function AdminLogsPageRoute() {
  try {
    await requireRole([Role.Admin]);
  } catch (error) {
    redirect("/");
  }

  const auditLogs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { actor: true, task: true },
  });

  const systemLogs = await db.systemLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { actor: true, task: true },
  });

  // Helper function to get concise action from actionType
  const getConciseAction = (actionType: string | null | undefined): string => {
    if (!actionType) return 'unknown';
    return actionType.toLowerCase();
  };

  // Combine and sort by date (most recent first)
  const recentActivity = [
    ...auditLogs.map(log => ({
      id: log.id,
      type: 'audit' as const,
      action: log.action,
      description: undefined,
      createdAt: log.createdAt,
      actor: log.actor,
      task: log.task,
    })),
    ...systemLogs.map(log => ({
      id: log.id,
      type: 'system' as const,
      action: getConciseAction(log.actionType),
      description: log.description,
      actionType: log.actionType,
      entityType: log.entityType,
      createdAt: log.createdAt,
      actor: log.actor,
      task: log.task || (log.taskTitle ? { id: log.taskId || null, title: log.taskTitle } : null),
      taskTitle: log.taskTitle,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return <AdminLogsPage recentActivity={recentActivity} />;
}
