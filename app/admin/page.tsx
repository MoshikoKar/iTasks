import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPageWrapper } from "@/components/admin-page-wrapper";

export default async function AdminPage() {
  try {
    await requireRole([Role.Admin]);
  } catch (error) {
    redirect("/");
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      createdAt: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasksAssigned: true,
          tasksCreated: true,
        },
      },
    },
  });

  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  const stats = await db.user.groupBy({
    by: ["role"],
    _count: true,
  });

  const recentActivity = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: true, task: true },
  });

  return <AdminPageWrapper users={users} teams={teams} stats={stats} recentActivity={recentActivity} />;
}

