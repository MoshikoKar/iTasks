import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDateTime } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";

/** Max tasks per list per page to keep server render and memory bounded. */
const SLA_PAGE_SIZE = 50;

export default async function SLAPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; assignee?: string; branch?: string }>;
}) {
  try {
    await requireRole([Role.Admin, Role.TeamLead]);
  } catch (error) {
    redirect("/");
  }
  const params = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const assigneeName = params.assignee?.trim() || undefined;
  const branchFilter = params.branch?.trim() || undefined;

  const now = new Date();
  const overdueWhere = {
    AND: [
      {
        OR: [
          { dueDate: { lt: now }, status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
          { slaDeadline: { lt: now }, status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
        ],
      },
      ...(assigneeName
        ? [
            {
              assignee: { name: { equals: assigneeName, mode: "insensitive" as const } },
            },
          ]
        : []),
      ...(branchFilter ? [{ branch: branchFilter }] : []),
    ],
  };
  const approachingWhere = {
    AND: [
      { slaDeadline: { gte: now } },
      { slaDeadline: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
      { status: { notIn: [TaskStatus.Resolved, TaskStatus.Closed] } },
      ...(assigneeName
        ? [
            {
              assignee: { name: { equals: assigneeName, mode: "insensitive" as const } },
            },
          ]
        : []),
      ...(branchFilter ? [{ branch: branchFilter }] : []),
    ],
  };

  const skip = (page - 1) * SLA_PAGE_SIZE;

  const [countOverdue, countApproaching, overdueTasks, approachingTasks] = await Promise.all([
    db.task.count({ where: overdueWhere }),
    db.task.count({ where: approachingWhere }),
    db.task.findMany({
      where: overdueWhere,
      include: {
        assignee: { select: { name: true, email: true } },
        context: true,
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { id: "asc" },
      ],
      skip,
      take: SLA_PAGE_SIZE,
    }),
    db.task.findMany({
      where: approachingWhere,
      include: {
        assignee: { select: { name: true, email: true } },
        context: true,
      },
      orderBy: [
        { priority: "desc" },
        { slaDeadline: "asc" },
        { id: "asc" },
      ],
      skip,
      take: SLA_PAGE_SIZE,
    }),
  ]);

  const allTasks = [...overdueTasks, ...approachingTasks];
  const totalOverduePages = Math.ceil(countOverdue / SLA_PAGE_SIZE) || 1;
  const totalApproachingPages = Math.ceil(countApproaching / SLA_PAGE_SIZE) || 1;
  const maxPage = Math.max(totalOverduePages, totalApproachingPages);
  const hasPaging = countOverdue > SLA_PAGE_SIZE || countApproaching > SLA_PAGE_SIZE;
  const queryString = (overrides: { page?: number }) => {
    const q = new URLSearchParams();
    if (params.assignee) q.set("assignee", params.assignee);
    if (params.branch) q.set("branch", params.branch);
    if (overrides.page !== undefined && overrides.page !== 1) q.set("page", String(overrides.page));
    const s = q.toString();
    return s ? `?${s}` : "";
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">SLA & Exceptions</h1>
        <div className="text-sm text-muted-foreground">
          {countOverdue} Overdue • {countApproaching} Approaching
        </div>
      </div>

      {/* Filters and paging */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="get" action="/sla" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="page" value="1" />
          <input
            type="text"
            name="assignee"
            placeholder="Filter by assignee"
            defaultValue={params.assignee ?? ""}
            className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="text"
            name="branch"
            placeholder="Filter by branch"
            defaultValue={params.branch ?? ""}
            className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Apply
          </button>
          {(params.assignee || params.branch) && (
            <Link
              href="/sla"
              className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              Clear
            </Link>
          )}
        </form>
        {hasPaging && (
          <nav className="flex items-center gap-2 text-sm">
            {page > 1 ? (
              <Link
                href={`/sla${queryString({ page: page - 1 })}`}
                className="text-primary hover:underline"
              >
                Previous
              </Link>
            ) : (
              <span className="text-muted-foreground">Previous</span>
            )}
            <span className="text-muted-foreground">
              Page {page} of {maxPage}
            </span>
            {page < maxPage ? (
              <Link
                href={`/sla${queryString({ page: page + 1 })}`}
                className="text-primary hover:underline"
              >
                Next
              </Link>
            ) : (
              <span className="text-muted-foreground">Next</span>
            )}
          </nav>
        )}
      </div>

      {hasPaging && (
        <p className="text-sm text-muted-foreground">
          Showing up to {SLA_PAGE_SIZE} overdue and {SLA_PAGE_SIZE} approaching tasks per page. Use
          filters or pagination to drill down.
        </p>
      )}

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
                            <Tooltip
                              description={
                                isOverdue
                                  ? "SLA deadline has passed - task is overdue"
                                  : hoursRemaining !== null
                                  ? `Time remaining until SLA deadline: ${hoursRemaining} hours`
                                  : "No SLA deadline set"
                              }
                              showIcon={false}
                            >
                              <span className="cursor-help">
                                {isOverdue ? "OVERDUE" : hoursRemaining !== null ? `${hoursRemaining}h` : "-"}
                              </span>
                            </Tooltip>
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

