"use client";

import { useState } from "react";
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
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { FullListModal } from "@/components/dashboard/full-list-modal";

interface DashboardContentProps {
  stats: any;
  user: any;
}

export function DashboardContent({ stats, user }: DashboardContentProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "branches" | "technicians" | null;
  }>({ isOpen: false, type: null });

  const openModal = (type: "branches" | "technicians") => {
    setModalState({ isOpen: true, type });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null });
  };

  const getModalData = () => {
    if (modalState.type === "branches") {
      return {
        title: "All Branches",
        items: stats.branchDistribution.map((item: any) => ({ name: item.branch, count: item.count })),
        type: "branches" as const,
        icon: <TrendingUp size={20} className="text-primary" />,
      };
    } else if (modalState.type === "technicians") {
      return {
        title: "All Technicians",
        items: stats.userDistribution?.map((item: any) => ({ name: item.user, count: item.count })) || [],
        type: "technicians" as const,
        icon: <ListTodo size={20} className="text-primary" />,
      };
    }
    return null;
  };

  const modalData = getModalData();

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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
        <StatCard
          label="Stale Tasks"
          value={stats.stale}
          icon={<AlertOctagon size={24} />}
          color="orange"
          href="/tasks?status=Open&stale=1"
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
      <div className={`grid items-start grid-cols-1 md:grid-cols-2 ${user.role === 'Technician' || user.role === 'Viewer' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
        {/* Weekly Ticket Volume */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm h-[360px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              Weekly Ticket Volume
            </h2>
          </div>
          <div className="flex-1">
            <BarChart data={stats.weeklyVolume} />
          </div>
        </section>

        {/* Tasks by Priority */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm h-[360px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <PieChart size={20} className="text-primary" />
              Tasks by Priority
            </h2>
          </div>
          <div className="w-full flex-1">
            <DonutChart data={stats.priorityDistribution} />
          </div>
        </section>

        {/* Tasks by Branch */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm h-[360px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Tasks by Branch
            </h2>
            {stats.branchDistribution.length > 10 && (
              <button
                onClick={() => openModal("branches")}
                className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
              >
                View all →
              </button>
            )}
          </div>
          {stats.branchDistribution.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <PieChart size={40} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-foreground font-semibold mb-1">All locations covered</p>
              <p className="text-sm text-muted-foreground">No branch-specific tasks yet</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {stats.branchDistribution.slice(0, 10).map((item) => (
                  <Link
                    key={item.branch}
                    href={`/tasks?branch=${encodeURIComponent(item.branch)}&status=Open`}
                    className="block py-0.5 px-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                      <span className="font-medium text-foreground text-xs">{item.branch}</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary flex-shrink-0">
                      {item.count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Tasks per Technician - Only visible for Admin and TeamLead */}
        {(user.role === 'Admin' || user.role === 'TeamLead') && (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm h-[360px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <ListTodo size={20} className="text-primary" />
                Tasks per Technician
              </h2>
              {stats.userDistribution && stats.userDistribution.length > 10 && (
                <button
                  onClick={() => openModal("technicians")}
                  className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
                >
                  View all →
                </button>
              )}
            </div>
            {!stats.userDistribution || stats.userDistribution.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                <ListTodo size={40} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-foreground font-semibold mb-1">Workload balanced</p>
                <p className="text-sm text-muted-foreground">No active task assignments</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
                {stats.userDistribution.map((item) => (
                  <Link
                    key={item.user}
                    href={`/tasks?assignee=${encodeURIComponent(item.user)}&status=Open`}
                    className="block py-0.5 px-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                        <span className="font-medium text-foreground truncate text-xs">{item.user}</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary flex-shrink-0">
                        {item.count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Full List Modal */}
      {modalData && (
        <FullListModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalData.title}
          items={modalData.items}
          type={modalData.type}
          icon={modalData.icon}
        />
      )}
    </div>
  );
}