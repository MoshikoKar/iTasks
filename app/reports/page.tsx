import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import { requireRole, requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports-client";

export default async function ReportsPage() {
  try {
    await requireRole([Role.Admin, Role.TeamLead, Role.Viewer]);
  } catch (error) {
    redirect("/");
  }

  const currentUser = await requireAuth();

  // For TeamLead and Viewer users, only show data for their team
  const shouldFilterByTeam = (currentUser.role === Role.TeamLead || currentUser.role === Role.Viewer) && currentUser.teamId;

  // Fetch task data with filtering based on user role
  const tasks = await db.task.findMany({
    where: shouldFilterByTeam ? {
      assignee: {
        teamId: currentUser.teamId
      }
    } : {},
    include: {
      assignee: { select: { name: true, role: true, team: { select: { name: true } } } },
      creator: { select: { name: true } },
      context: { select: { serverName: true, application: true, environment: true } },
    },
  });

  // Fetch team data - for TeamLead and Viewer, only their team
  const teams = await db.team.findMany({
    where: shouldFilterByTeam ? {
      id: currentUser.teamId
    } : {},
    select: {
      id: true,
      name: true,
      members: {
        select: {
          name: true,
          _count: {
            select: { tasksAssigned: true }
          }
        }
      }
    }
  });

  return <ReportsClient tasks={tasks} teams={teams} />;
}

