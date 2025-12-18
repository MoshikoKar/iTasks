import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";

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
        <h1 className="text-2xl font-bold text-foreground">SLA & Exceptions</h1>
        <div className="text-sm text-muted-foreground">
          {overdueTasks.length} Overdue • {approachingTasks.length} Approaching
        </div>
      </div>

      {allTasks.length === 0 ? (
        <div className="card-base p-8 text-center text-muted-foreground">
          No SLA exceptions found. All tasks are on track.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByAssignee).map(([assigneeName, tasks]) => (
            <div key={assigneeName} className="card-base">
              <div className="border-b border-border bg-muted px-4 py-3 font-semibold text-foreground">
                {assigneeName} ({tasks.length} tasks)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-foreground">Severity</th>
                      <th className="px-4 py-2 text-left text-foreground">Title</th>
                      <th className="px-4 py-2 text-left text-foreground">Server/App</th>
                      <th className="px-4 py-2 text-left text-foreground">Due Date</th>
                      <th className="px-4 py-2 text-left text-foreground">SLA Deadline</th>
                      <th className="px-4 py-2 text-left text-foreground">Time Remaining</th>
                      <th className="px-4 py-2 text-left text-foreground">Status</th>
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
                        <tr key={task.id} className="border-t border-border hover:bg-muted/50">
                          <td className="px-4 py-2">
                            <PriorityBadge priority={task.priority} />
                          </td>
                          <td className="px-4 py-2">
                            <Link href={`/tasks/${task.id}`} className="text-primary hover:underline">
                              {task.title}
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-foreground">
                            {task.context?.serverName || task.context?.application || "-"}
                          </td>
                          <td className={`px-4 py-2 ${isOverdue ? "font-semibold text-destructive" : "text-foreground"}`}>
                            {task.dueDate ? formatDateTime(task.dueDate) : "-"}
                          </td>
                          <td className="px-4 py-2 text-foreground">
                            {task.slaDeadline ? formatDateTime(task.slaDeadline) : "-"}
                          </td>
                          <td className={`px-4 py-2 font-semibold ${isOverdue ? "text-destructive" : hoursRemaining && hoursRemaining < 24 ? "text-warning" : "text-foreground"}`}>
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
  return <Badge variant="priority" value={priority} />;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant="status" value={status} />;
}

