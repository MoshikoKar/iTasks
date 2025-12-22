import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports-client";

export default async function ReportsPage() {
  try {
    await requireRole([Role.Admin, Role.TeamLead]);
  } catch (error) {
    redirect("/");
  }

  // Fetch comprehensive task data with all necessary relations
  const tasks = await db.task.findMany({
    include: {
      assignee: { select: { name: true, role: true, team: { select: { name: true } } } },
      creator: { select: { name: true } },
      context: { select: { serverName: true, application: true, environment: true } },
    },
  });

  // Fetch team data for team-based analytics
  const teams = await db.team.findMany({
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

