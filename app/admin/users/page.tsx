import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsersPage } from "@/components/admin-users-page";

export default async function AdminUsersPageRoute() {
  try {
    await requireRole([Role.Admin]);
  } catch (error) {
    redirect("/");
  }

  const [users, teams, stats, systemConfig] = await Promise.all([
    db.user.findMany({
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
    }),
    db.team.findMany({
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
    }),
    db.user.groupBy({
      by: ["role"],
      _count: true,
    }),
    db.systemConfig.findUnique({
      where: { id: "system" },
      select: { passwordPolicyLevel: true },
    }),
  ]);

  const passwordPolicyLevel = systemConfig?.passwordPolicyLevel || 'strong';

  return <AdminUsersPage users={users} teams={teams} stats={stats} passwordPolicyLevel={passwordPolicyLevel} />;
}
