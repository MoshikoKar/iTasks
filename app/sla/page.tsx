import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils/date";

export default async function SLAPage() {
  try {
    await requireRole([Role.Admin, Role.TeamLead]);
  } catch (error) {
    redirect("/");
  }
  const now = new Date();
  
  const overdueTasks = await db.task.findMany({
    where: {
      OR: [
        { dueDate: { lt: now }, status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
        { slaDeadline: { lt: now }, status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
      ],
    },
    include: {
      assignee: { select: { name: true, email: true } },
      context: true,
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
    ],
  });

  const approachingTasks = await db.task.findMany({
    where: {
      AND: [
        { slaDeadline: { gte: now } },
        { slaDeadline: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
        { status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
      ],
    },
    include: {
      assignee: { select: { name: true, email: true } },
      context: true,
    },
    orderBy: [
      { priority: "desc" },
      { slaDeadline: "asc" },
    ],
  });

  const allTasks = [...overdueTasks, ...approachingTasks];

  const groupedByAssignee = allTasks.reduce((acc, task) => {
    const assigneeName = task.assignee.name;
    if (!acc[assigneeName]) {
      acc[assigneeName] = [];
    }
    acc[assigneeName].push(task);
    return acc;
  }, {} as Record<string, typeof allTasks>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-neutral-100">SLA & Exceptions</h1>
        <div className="text-sm text-slate-600 dark:text-neutral-400">
          {overdueTasks.length} Overdue • {approachingTasks.length} Approaching
        </div>
      </div>

      {allTasks.length === 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-8 text-center text-slate-500 dark:text-neutral-400">
          No SLA exceptions found. All tasks are on track.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByAssignee).map(([assigneeName, tasks]) => (
            <div key={assigneeName} className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <div className="border-b border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-700/50 px-4 py-3 font-semibold text-slate-900 dark:text-neutral-100">
                {assigneeName} ({tasks.length} tasks)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-neutral-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-slate-700 dark:text-neutral-200">Severity</th>
                      <th className="px-4 py-2 text-left text-slate-700 dark:text-neutral-200">Title</th>
                      <th className="px-4 py-2 text-left text-slate-700 dark:text-neutral-200">Server/App</th>
                      <th className="px-4 py-2 text-left text-slate-700 dark:text-neutral-200">Due Date</th>
                      <th className="px-4 py-2 text-left text-slate-700 dark:text-neutral-200">SLA Deadline</th>
                      <th className="px-4 py-2 text-left text-slate-700 dark:text-neutral-200">Time Remaining</th>
                      <th className="px-4 py-2 text-left text-slate-700 dark:text-neutral-200">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const isOverdue = task.dueDate && task.dueDate < now;
                      const timeRemaining = task.slaDeadline
                        ? Math.max(0, task.slaDeadline.getTime() - now.getTime())
                        : null;
                      const hoursRemaining = timeRemaining ? Math.floor(timeRemaining / (1000 * 60 * 60)) : null;

                      return (
                        <tr key={task.id} className="border-t border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700/50">
                          <td className="px-4 py-2">
                            <PriorityBadge priority={task.priority} />
                          </td>
                          <td className="px-4 py-2">
                            <Link href={`/tasks/${task.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                              {task.title}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-slate-900 dark:text-neutral-100">
                            {task.context?.serverName || task.context?.application || "-"}
                          </td>
                          <td className={`px-4 py-2 ${isOverdue ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-900 dark:text-neutral-100"}`}>
                            {task.dueDate ? formatDateTime(task.dueDate) : "-"}
                          </td>
                          <td className="px-4 py-2 text-slate-900 dark:text-neutral-100">
                            {task.slaDeadline ? formatDateTime(task.slaDeadline) : "-"}
                          </td>
                          <td className={`px-4 py-2 font-semibold ${isOverdue ? "text-red-600 dark:text-red-400" : hoursRemaining && hoursRemaining < 24 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-neutral-100"}`}>
                            {isOverdue ? "OVERDUE" : hoursRemaining !== null ? `${hoursRemaining}h` : "-"}
                          </td>
                          <td className="px-4 py-2">
                            <StatusBadge status={task.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors: Record<TaskPriority, string> = {
    Low: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    Medium: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    High: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300",
    Critical: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[priority]}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    Open: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
    InProgress: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
    PendingVendor: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    PendingUser: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
    Resolved: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    Closed: "bg-slate-100 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200",
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}>{status}</span>;
}

