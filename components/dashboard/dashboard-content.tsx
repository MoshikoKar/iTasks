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
import { Tooltip } from "@/components/ui/tooltip";

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

  // Get personalized greeting based on time of day
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Good morning", emoji: "🌅" };
    if (hour < 17) return { greeting: "Good afternoon", emoji: "☀️" };
    return { greeting: "Good evening", emoji: "🌙" };
  };

  // Extract first name from user's display name and capitalize it
  const getFirstName = (fullName: string) => {
    const firstName = fullName.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  const { greeting, emoji } = getTimeBasedGreeting();
  const firstName = getFirstName(user.name || 'User');

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
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Welcome Header - Responsive Layout */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{greeting}, {firstName}! {emoji} Here's your overview.</p>
        </div>
        <div className="flex-shrink-0">
          <DashboardClient />
        </div>
      </div>

      {/* Stat Cards - Mobile-First Responsive Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard
          label="Open Tasks"
          value={stats.open}
          icon={<CheckCircle2 size={24} />}
          color="blue"
          href="/tasks?status=Open"
          tooltip="Total number of tasks currently in Open status"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle size={24} />}
          color="red"
          highlight
          href="/tasks?status=Open&overdue=1"
          tooltip="Tasks that have passed their due date and are still open"
        />
        <StatCard
          label="SLA Breaches"
          value={stats.slaBreaches}
          icon={<Clock size={24} />}
          color="orange"
          highlight
          href="/tasks?status=Open&slaBreach=1"
          tooltip="Tasks that have exceeded their Service Level Agreement deadline"
        />
        <StatCard
          label="Critical"
          value={stats.critical}
          icon={<AlertCircle size={24} />}
          color="purple"
          href="/tasks?priority=Critical"
          tooltip="Tasks with Critical priority level"
        />
        <StatCard
          label="Stale Tasks"
          value={stats.stale}
          icon={<AlertOctagon size={24} />}
          color="orange"
          href="/tasks?status=Open&stale=1"
          tooltip="Open tasks that haven't been updated in a while"
        />
      </div>

      {/* My Open Tasks and My Day Sections - Mobile Stacked, Tablet Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* My Open Tasks Section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <Tooltip content="Tasks assigned to you that are currently open" showIcon={false}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ListTodo size={18} className="text-primary" />
                My Open Tasks
              </h2>
            </Tooltip>
            <Link href="/tasks/my" className="text-xs text-primary hover:text-primary/80 font-medium">
              View all →
            </Link>
          </div>
          {/* Mobile Card Layout (320px-480px) */}
          <div className="block md:hidden">
            {stats.myOpenTasks.length === 0 ? (
              <div className="rounded-xl border border-border bg-card shadow-sm p-6 text-center">
                <CheckCircle2 size={40} className="mx-auto text-success mb-2" />
                <p className="text-foreground font-semibold mb-1">All clear!</p>
                <p className="text-sm text-muted-foreground mb-3">No open tasks assigned to you</p>
                <Link
                  href="/tasks?create=1"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Create Task
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.myOpenTasks.slice(0, 5).map((task: { id: string; title: string; slaDeadline: Date | null; priority: TaskPriority }) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-border bg-card shadow-sm p-4 hover:bg-primary/5 transition-colors"
                  >
                    <Link
                      href={`/tasks/${task.id}`}
                      className="block"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground text-base leading-tight flex-1 min-w-0">
                          {task.title}
                        </h3>
                        <Badge variant="priority" value={task.priority as TaskPriority} className="ml-2 flex-shrink-0" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">SLA: </span>
                        {formatDateTime(task.slaDeadline)}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table Layout (481px+) */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
                  {stats.myOpenTasks.slice(0, 5).map((task: { id: string; title: string; slaDeadline: Date | null; priority: TaskPriority }) => (
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
            <Tooltip content="Tasks scheduled for today that are assigned to you" showIcon={false}>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                My Day
              </h2>
            </Tooltip>
            <Link href="/tasks/my" className="text-xs text-primary hover:text-primary/80 font-medium">
              View all →
            </Link>
          </div>
          {/* Mobile Card Layout (320px-480px) */}
          <div className="block md:hidden">
            {stats.myDay.length === 0 ? (
              <div className="rounded-xl border border-border bg-card shadow-sm p-6 text-center">
                <CheckCircle2 size={40} className="mx-auto text-success mb-2" />
                <p className="text-sm text-muted-foreground font-medium">All caught up for today!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.myDay.slice(0, 5).map((task: { id: string; title: string; dueDate: Date | null; priority: TaskPriority }) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-border bg-card shadow-sm p-4 hover:bg-primary/5 transition-colors"
                  >
                    <Link
                      href={`/tasks/${task.id}`}
                      className="block"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground text-base leading-tight flex-1 min-w-0">
                          {task.title}
                        </h3>
                        <Badge variant="priority" value={task.priority as TaskPriority} className="ml-2 flex-shrink-0" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Due: </span>
                        {formatDateTime(task.dueDate)}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table Layout (481px+) */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
                  {stats.myDay.slice(0, 5).map((task: { id: string; title: string; dueDate: Date | null; priority: TaskPriority }) => (
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

      {/* Analytics Widgets - Mobile-First Responsive Grid */}
      <div className={`grid items-start gap-3 sm:gap-4 md:gap-6 ${
        user.role === 'Technician' || user.role === 'Viewer'
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }`}>
        {/* Weekly Ticket Volume */}
        <section className="rounded-xl border border-border bg-card pt-4 sm:pt-6 px-4 sm:px-6 pb-2 shadow-sm h-[260px] sm:h-[300px] md:h-[340px] flex flex-col">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <Tooltip content="Number of tasks created each day over the past week" showIcon={false}>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
                <BarChart3 size={18} className="text-primary flex-shrink-0" />
                <span className="truncate">Weekly Volume</span>
              </h2>
            </Tooltip>
          </div>
          <div className="flex-1 mt-4 sm:mt-6 md:mt-8 min-h-0">
            <BarChart data={stats.weeklyVolume} />
          </div>
        </section>

        {/* Tasks by Priority */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm h-[260px] sm:h-[300px] md:h-[340px] flex flex-col">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <Tooltip content="Distribution of tasks across different priority levels" showIcon={false}>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
                <PieChart size={18} className="text-primary flex-shrink-0" />
                <span className="truncate">Tasks by Priority</span>
              </h2>
            </Tooltip>
          </div>
          <div className="w-full flex-1 min-h-0">
            <DonutChart data={stats.priorityDistribution} />
          </div>
        </section>

        {/* Tasks by Branch */}
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm h-[260px] sm:h-[300px] md:h-[340px] flex flex-col">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <Tooltip content="Number of open tasks grouped by branch location" showIcon={false}>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
                <TrendingUp size={18} className="text-primary flex-shrink-0" />
                <span className="truncate">Tasks by Branch</span>
              </h2>
            </Tooltip>
            {stats.branchDistribution.length > 10 && (
              <button
                onClick={() => openModal("branches")}
                className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer flex-shrink-0"
              >
                View all →
              </button>
            )}
          </div>
          {stats.branchDistribution.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <PieChart size={32} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-foreground font-semibold mb-1 text-sm">All locations covered</p>
              <p className="text-xs text-muted-foreground">No branch-specific tasks yet</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
              {stats.branchDistribution.slice(0, 10).map((item: { branch: string; count: number }) => (
                  <Link
                    key={item.branch}
                    href={`/tasks?branch=${encodeURIComponent(item.branch)}&status=Open`}
                    className="block py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                      <span className="font-medium text-foreground text-xs truncate">{item.branch}</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary flex-shrink-0 ml-2">
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
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm h-[260px] sm:h-[300px] md:h-[340px] flex flex-col">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <Tooltip content="Number of open tasks assigned to each technician" showIcon={false}>
                <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
                  <ListTodo size={18} className="text-primary flex-shrink-0" />
                  <span className="truncate">Tasks per Technician</span>
                </h2>
              </Tooltip>
              {stats.userDistribution && stats.userDistribution.length > 10 && (
                <button
                  onClick={() => openModal("technicians")}
                  className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer flex-shrink-0"
                >
                  View all →
                </button>
              )}
            </div>
            {!stats.userDistribution || stats.userDistribution.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                <ListTodo size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-foreground font-semibold mb-1 text-sm">Workload balanced</p>
                <p className="text-xs text-muted-foreground">No active task assignments</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                {stats.userDistribution.map((item: { user: string; count: number }) => (
                  <Link
                    key={item.user}
                    href={`/tasks?assignee=${encodeURIComponent(item.user)}&status=Open`}
                    className="block py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></div>
                        <span className="font-medium text-foreground truncate text-xs">{item.user}</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary flex-shrink-0 ml-2">
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