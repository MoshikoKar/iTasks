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
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const stats = await getDashboardStats(user.id);

  return <DashboardContent stats={stats} user={user} />;
}
