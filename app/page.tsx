import { TaskPriority, TaskStatus } from "@prisma/client";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  TrendingUp,
  ListTodo,
  BarChart3,
  PieChart,
  AlertOctagon,
} from "lucide-react";
import Link from "next/link";
import { BarChart } from "@/components/BarChart";
import { DonutChart } from "@/components/DonutChart";
import { Badge } from "@/components/ui/badge";
import { AuditPreview } from "@/components/ui/audit-preview";
import { formatDateTime, formatDate } from "@/lib/utils/date";
import { getDashboardStats } from "@/app/actions/dashboard";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const stats = await getDashboardStats(user.id);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>
        <DashboardClient />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Open Tasks" 
          value={stats.open} 
          icon={<CheckCircle2 size={24} />} 
          color="blue" 
          href="/tasks?status=Open"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle size={24} />}
          color="red"
          highlight
          href="/tasks?status=Open&overdue=1"
        />
        <StatCard
          label="SLA Breaches"
          value={stats.slaBreaches}
          icon={<Clock size={24} />}
          color="orange"
          highlight
          href="/tasks?status=Open&slaBreach=1"
        />
        <StatCard 
          label="Critical" 
          value={stats.critical} 
          icon={<AlertCircle size={24} />} 
          color="purple"
          href="/tasks?priority=Critical"
        />
      </div>

      {/* My Open Tasks and My Day Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Open Tasks Section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ListTodo size={18} className="text-primary" />
              My Open Tasks
            </h2>
            <Link href="/tasks/my" className="text-xs text-primary hover:text-primary/80 font-medium">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {stats.myOpenTasks.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 size={40} className="mx-auto text-success mb-2" />
                <p className="text-foreground font-semibold mb-1">All clear!</p>
                <p className="text-sm text-muted-foreground mb-3">No open tasks assigned to you</p>
                <Link
                  href="/tasks?create=1"
                  className="inline-flex items-center justify-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Create Task
                </Link>
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.myOpenTasks.slice(0, 5).map((task) => (
                      <tr key={task.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors text-xs"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          {formatDateTime(task.slaDeadline)}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="priority" value={task.priority as TaskPriority} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
          </div>
        </section>

        {/* My Day Section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              My Day
            </h2>
            <Link href="/tasks/my" className="text-xs text-primary hover:text-primary/80 font-medium">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {stats.myDay.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 size={40} className="mx-auto text-success mb-2" />
                <p className="text-sm text-muted-foreground font-medium">All caught up for today!</p>
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Due
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.myDay.slice(0, 5).map((task) => (
                      <tr key={task.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors text-xs"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          {formatDateTime(task.dueDate)}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="priority" value={task.priority as TaskPriority} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            )}
          </div>
        </section>
      </div>

      {/* Analytics Widgets - 3 or 4 columns row based on role */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${user.role === 'Technician' || user.role === 'Viewer' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        {/* Weekly Ticket Volume */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              Weekly Ticket Volume
            </h2>
          </div>
          <BarChart data={stats.weeklyVolume} />
        </section>

        {/* Tasks by Priority */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <PieChart size={20} className="text-primary" />
              Tasks by Priority
            </h2>
          </div>
          <div className="w-full">
            <DonutChart data={stats.priorityDistribution} />
          </div>
        </section>

        {/* Tasks by Branch */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Tasks by Branch
            </h2>
          </div>
          {stats.branchDistribution.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <PieChart size={40} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-foreground font-semibold mb-1">All locations covered</p>
              <p className="text-sm text-muted-foreground">No branch-specific tasks yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.branchDistribution.map((item) => (
                <div
                  key={item.branch}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="font-medium text-foreground">{item.branch}</span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tasks per Technician - Only visible for Admin and TeamLead */}
        {(user.role === 'Admin' || user.role === 'TeamLead') && (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <ListTodo size={20} className="text-primary" />
                Tasks per Technician
              </h2>
            </div>
            {!stats.userDistribution || stats.userDistribution.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <ListTodo size={40} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-foreground font-semibold mb-1">Workload balanced</p>
                <p className="text-sm text-muted-foreground">No active task assignments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.userDistribution.map((item) => (
                  <div
                    key={item.user}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="font-medium text-foreground truncate">{item.user}</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Stale Tasks */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <AlertOctagon size={20} className="text-warning" />
            Stale Tasks
          </h2>
        </div>
        <div className="text-xs text-muted-foreground mb-3">No updates for more than 7 days</div>
        {stats.staleTasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle2 size={40} className="mx-auto text-success mb-2" />
            <p className="text-foreground font-semibold mb-1">Everything's moving!</p>
            <p className="text-sm text-muted-foreground">No stale tasks - great job keeping things updated</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.staleTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="block p-3 rounded-lg border border-border hover:border-warning/50 hover:bg-warning/5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{task.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <AuditPreview
                        lastUpdated={task.updatedAt}
                        updatedBy={task.assignee?.name}
                        change="Task updated"
                      >
                        <span className="text-xs text-muted-foreground cursor-help">
                          Last update: {formatDate(task.updatedAt)}
                        </span>
                      </AuditPreview>
                      <Badge variant="priority" value={task.priority} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
