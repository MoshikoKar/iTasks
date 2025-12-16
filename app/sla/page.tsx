import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

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
        <h1 className="text-2xl font-bold">SLA & Exceptions</h1>
        <div className="text-sm text-slate-600">
          {overdueTasks.length} Overdue • {approachingTasks.length} Approaching
        </div>
      </div>

      {allTasks.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          No SLA exceptions found. All tasks are on track.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByAssignee).map(([assigneeName, tasks]) => (
            <div key={assigneeName} className="rounded-lg border bg-white">
              <div className="border-b bg-slate-50 px-4 py-3 font-semibold">
                {assigneeName} ({tasks.length} tasks)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Severity</th>
                      <th className="px-4 py-2 text-left">Title</th>
                      <th className="px-4 py-2 text-left">Server/App</th>
                      <th className="px-4 py-2 text-left">Due Date</th>
                      <th className="px-4 py-2 text-left">SLA Deadline</th>
                      <th className="px-4 py-2 text-left">Time Remaining</th>
                      <th className="px-4 py-2 text-left">Status</th>
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
                        <tr key={task.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <PriorityBadge priority={task.priority} />
                          </td>
                          <td className="px-4 py-2">
                            <Link href={`/tasks/${task.id}`} className="text-blue-600 hover:underline">
                              {task.title}
                            </Link>
                          </td>
                          <td className="px-4 py-2">
                            {task.context?.serverName || task.context?.application || "-"}
                          </td>
                          <td className={`px-4 py-2 ${isOverdue ? "font-semibold text-red-600" : ""}`}>
                            {task.dueDate?.toLocaleString() || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {task.slaDeadline?.toLocaleString() || "-"}
                          </td>
                          <td className={`px-4 py-2 font-semibold ${isOverdue ? "text-red-600" : hoursRemaining && hoursRemaining < 24 ? "text-amber-600" : ""}`}>
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
    Low: "bg-green-100 text-green-800",
    Medium: "bg-blue-100 text-blue-800",
    High: "bg-amber-100 text-amber-800",
    Critical: "bg-red-100 text-red-800",
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[priority]}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    Open: "bg-blue-100 text-blue-800",
    InProgress: "bg-purple-100 text-purple-800",
    PendingVendor: "bg-yellow-100 text-yellow-800",
    PendingUser: "bg-orange-100 text-orange-800",
    Resolved: "bg-green-100 text-green-800",
    Closed: "bg-slate-100 text-slate-800",
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}>{status}</span>;
}

