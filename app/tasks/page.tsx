import { db } from "@/lib/db";
import { TasksPageWrapper } from "@/components/tasks-page-wrapper";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

/**
 * Build task filter based on user role (RBAC)
 */
function buildTaskFilter(user: { id: string; role: Role; teamId: string | null }) {
  switch (user.role) {
    case Role.Admin:
      // Admin sees ALL tasks
      return {};

    case Role.TeamLead:
      // TeamLead sees tasks where assignee is in their team OR tasks they created/are assigned to
      if (user.teamId) {
        return {
          OR: [
            { assignee: { teamId: user.teamId } },
            { assigneeId: user.id },
            { creatorId: user.id },
          ],
        };
      }
      // If TeamLead has no team, fall back to their own tasks
      return {
        OR: [{ assigneeId: user.id }, { creatorId: user.id }],
      };

    case Role.Technician:
    case Role.Viewer:
    default:
      // Technician/Viewer sees only tasks assigned to them or created by them
      return {
        OR: [{ assigneeId: user.id }, { creatorId: user.id }],
      };
  }
}

export default async function TasksPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  try {
    const taskFilter = buildTaskFilter(currentUser);

    const [tasks, users] = await Promise.all([
      db.task.findMany({
        where: taskFilter,
        include: {
          assignee: { select: { name: true } },
          context: { select: { serverName: true, application: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return (
      <TasksPageWrapper
        tasks={tasks}
        currentUser={{ id: currentUser.id, name: currentUser.name }}
        users={users}
        showFilters={true}
      />
    );
  } catch (error) {
    console.error("Error loading tasks:", error);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">All Tasks</h1>
        <div className="rounded-lg border bg-white p-6 text-center text-red-600">
          Failed to load tasks. Please try again later.
        </div>
      </div>
    );
  }
}

