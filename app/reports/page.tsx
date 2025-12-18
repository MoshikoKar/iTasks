import { db } from "@/lib/db";
import { TaskStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  try {
    await requireRole([Role.Admin, Role.TeamLead]);
  } catch (error) {
    redirect("/");
  }
  const tasks = await db.task.findMany({
    include: {
      assignee: { select: { name: true } },
      context: { select: { serverName: true, application: true } },
    },
  });

  const workloadByTechnician = tasks.reduce((acc, task) => {
    const name = task.assignee.name;
    if (!acc[name]) {
      acc[name] = { total: 0, open: 0, inProgress: 0, resolved: 0 };
    }
    acc[name].total++;
    if (task.status === TaskStatus.Open) acc[name].open++;
    if (task.status === TaskStatus.InProgress) acc[name].inProgress++;
    if (task.status === TaskStatus.Resolved || task.status === TaskStatus.Closed) acc[name].resolved++;
    return acc;
  }, {} as Record<string, { total: number; open: number; inProgress: number; resolved: number }>);

  const resolvedTasks = tasks.filter(
    (t) => t.status === TaskStatus.Resolved || t.status === TaskStatus.Closed
  );
  const resolutionTimes = resolvedTasks
    .map((t) => {
      if (!t.createdAt || !t.updatedAt) return null;
      return (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
    })
    .filter((t): t is number => t !== null);
  const avgResolutionTime = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0;

  const assetIssues = tasks.reduce((acc, task) => {
    const key = task.context?.serverName || task.context?.application || "Unknown";
    if (!acc[key]) {
      acc[key] = 0;
    }
    acc[key]++;
    return acc;
  }, {} as Record<string, number>);

  const topAssets = Object.entries(assetIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Reports</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-base p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Workload per Technician</h2>
          <div className="space-y-3">
            {Object.entries(workloadByTechnician)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([name, stats]) => (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="text-muted-foreground">{stats.total} total</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(stats.total / Math.max(...Object.values(workloadByTechnician).map((s) => s.total))) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span>Open: {stats.open}</span>
                    <span>In Progress: {stats.inProgress}</span>
                    <span>Resolved: {stats.resolved}</span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="card-base p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Average Resolution Time</h2>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{avgResolutionTime.toFixed(1)}</div>
            <div className="mt-2 text-sm text-muted-foreground">hours</div>
            <div className="mt-4 text-xs text-muted-foreground">
              Based on {resolvedTasks.length} resolved tasks
            </div>
          </div>
        </section>
      </div>

      <section className="card-base p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Most Frequent Asset Issues</h2>
        {topAssets.length === 0 ? (
          <div className="text-center text-muted-foreground">No asset data available</div>
        ) : (
          <div className="space-y-2">
            {topAssets.map(([asset, count]) => (
              <div key={asset} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="font-medium text-foreground">{asset}</span>
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive border border-destructive/20">
                  {count} {count === 1 ? "issue" : "issues"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

