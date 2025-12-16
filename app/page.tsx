"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { motion } from "framer-motion";
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

interface DashboardStats {
  open: number;
  overdue: number;
  slaBreaches: number;
  critical: number;
  myDay: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    priority: TaskPriority;
  }>;
  myOpenTasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    slaDeadline: Date | null;
    priority: TaskPriority;
  }>;
  weeklyVolume: Array<{ date: string; count: number }>;
  priorityDistribution: Array<{ priority: TaskPriority; count: number }>;
  branchDistribution: Array<{ branch: string; count: number }>;
  staleTasks: Array<{
    id: string;
    title: string;
    updatedAt: Date;
    priority: TaskPriority;
    status: TaskStatus;
    assignee: { id: string; name: string } | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: Date;
    actor: { id: string; name: string } | null;
    task: { id: string; title: string } | null;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const user = await res.json();
          setUserId(user.id);
        } else {
          console.error("Failed to get user");
          if (res.status === 401) router.replace("/login");
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to get user:", error);
        router.replace("/login");
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const fetchStats = async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/dashboard", {
        cache: "no-store",
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const data = await res.json();
        // Convert date strings to Date objects
        const processedData = {
          ...data,
          myDay: data.myDay.map((task: any) => ({
            ...task,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
          })),
          myOpenTasks: data.myOpenTasks.map((task: any) => ({
            ...task,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            slaDeadline: task.slaDeadline ? new Date(task.slaDeadline) : null,
          })),
          staleTasks: data.staleTasks.map((task: any) => ({
            ...task,
            updatedAt: new Date(task.updatedAt),
          })),
          recentActivity: data.recentActivity.map((activity: any) => ({
            ...activity,
            createdAt: new Date(activity.createdAt),
          })),
        };
        setStats(processedData);
      } else if (res.status === 401) {
        router.replace("/login");
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchStats();

    let intervalId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchStats();
          }
        }, 60000);
      } else {
        clearInterval(intervalId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats();
      }
    }, 60000);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  if (loading || !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">Welcome back! Here's your overview.</p>
        </div>
        <div className="text-sm text-slate-500">
          <Clock className="inline mr-1" size={14} />
          Auto-refresh: 60s
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open Tasks" value={stats.open} icon={<CheckCircle2 size={24} />} color="blue" />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle size={24} />}
          color="red"
          highlight
        />
        <StatCard
          label="SLA Breaches"
          value={stats.slaBreaches}
          icon={<Clock size={24} />}
          color="orange"
          highlight
        />
        <StatCard label="Critical" value={stats.critical} icon={<AlertCircle size={24} />} color="purple" />
      </div>

      {/* My Open Tasks and My Day Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Open Tasks Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <ListTodo size={20} className="text-blue-600" />
              My Open Tasks
            </h2>
            <Link href="/tasks/my" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {stats.myOpenTasks.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                <p className="text-slate-600 font-medium mb-4">No open tasks!</p>
                <Link 
                  href="/tasks?create=1" 
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Create Your First Task
                </Link>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.myOpenTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {task.slaDeadline ? new Date(task.slaDeadline).toLocaleString() : "-"}
                      </td>
                      <td className="px-6 py-4">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              My Day
            </h2>
            <Link href="/tasks/my" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {stats.myDay.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
                <p className="text-slate-600 font-medium">All caught up for today!</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.myDay.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {task.dueDate ? new Date(task.dueDate).toLocaleString() : "-"}
                      </td>
                      <td className="px-6 py-4">
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

      {/* 2x2 Grid - Analytics Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Ticket Volume */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              Weekly Ticket Volume
            </h2>
          </div>
          <BarChart data={stats.weeklyVolume} />
        </section>

        {/* Tasks by Priority */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <PieChart size={20} className="text-blue-600" />
              Tasks by Priority
            </h2>
          </div>
          <DonutChart data={stats.priorityDistribution} />
        </section>

        {/* Tasks by Branch */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              Tasks by Branch
            </h2>
          </div>
          {stats.branchDistribution.length === 0 ? (
            <div className="py-8 text-center text-slate-600">
              <PieChart size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm">No branch data available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.branchDistribution.map((item) => (
                <div
                  key={item.branch}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                    <span className="font-medium text-slate-900">{item.branch}</span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-800">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Stale Tasks */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <AlertOctagon size={20} className="text-orange-600" />
              Stale Tasks
            </h2>
          </div>
          <div className="text-xs text-slate-500 mb-3">No updates for more than 7 days</div>
          {stats.staleTasks.length === 0 ? (
            <div className="py-8 text-center text-slate-600">
              <CheckCircle2 size={40} className="mx-auto text-green-500 mb-2" />
              <p className="text-sm">No stale tasks</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.staleTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          Last update: {new Date(task.updatedAt).toLocaleDateString()}
                        </span>
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
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "red" | "orange" | "purple";
  highlight?: boolean;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-600 bg-blue-50",
    red: "from-red-500 to-red-600 text-red-600 bg-red-50",
    orange: "from-orange-500 to-orange-600 text-orange-600 bg-orange-50",
    purple: "from-purple-500 to-purple-600 text-purple-600 bg-purple-50",
  };

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-xl border ${
        highlight ? "border-red-300 shadow-lg shadow-red-100" : "border-slate-200"
      } bg-white p-6`}
      whileHover={{ y: -4, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-600 mb-1">{label}</div>
          <div className={`text-4xl font-bold ${highlight ? "text-red-600" : "text-slate-900"} transition-all`}>
            {value}
          </div>
        </div>
        <div
          className={`rounded-lg ${
            colorClasses[color].split(" ")[2]
          } p-3 transition-transform group-hover:scale-110`}
        >
          <div className={colorClasses[color].split(" ")[0] + " " + colorClasses[color].split(" ")[1]}>{icon}</div>
        </div>
      </div>
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses[color].split(" ")[0]} ${
          colorClasses[color].split(" ")[1]
        }`}
      ></div>
    </motion.div>
  );
}

