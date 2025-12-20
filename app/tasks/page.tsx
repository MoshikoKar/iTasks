import { db } from "@/lib/db";
import { TasksPageWrapper } from "@/components/tasks-page-wrapper";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { Suspense } from "react";

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
      // Technician/Viewer sees tasks from their team (to match dashboard behavior)
      if (user.teamId) {
        return {
          assignee: { teamId: user.teamId },
        };
      }
      // If no team, fall back to their own tasks
      return {
        OR: [{ assigneeId: user.id }, { creatorId: user.id }],
      };
  }
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  try {
    const resolvedSearchParams = await searchParams;
    const pageParam = resolvedSearchParams?.page ? parseInt(resolvedSearchParams.page as string, 10) : 1;
    const page = pageParam > 0 ? pageParam : 1; // Ensure page is at least 1
    const pageSize = 50;
    const skip = (page - 1) * pageSize;

    const taskFilter = buildTaskFilter(currentUser);

    const [tasks, totalCount, users] = await Promise.all([
      db.task.findMany({
        where: taskFilter,
        include: {
          assignee: { select: { id: true, name: true } },
          context: { select: { serverName: true, application: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.task.count({
        where: taskFilter,
      }),
      // Filter users based on permission level - no one can assign to users above their level
      currentUser.role === Role.Admin
        ? db.user.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : currentUser.role === Role.TeamLead
        ? db.user.findMany({
            where: {
              OR: [
                { id: currentUser.id },
                { role: { in: [Role.Technician, Role.Viewer] } },
                ...(currentUser.teamId ? [{ teamId: currentUser.teamId, role: { not: Role.Admin } }] : []),
              ],
            },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : db.user.findMany({
            where: { id: currentUser.id },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
      <Suspense fallback={<div className="space-y-4"><h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">All Tasks</h1><div className="text-slate-600 dark:text-neutral-400">Loading...</div></div>}>
        <TasksPageWrapper
          tasks={tasks}
          currentUser={{ id: currentUser.id, name: currentUser.name }}
          users={users}
          showFilters={true}
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading tasks:", error);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">All Tasks</h1>
        <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 text-center text-red-600 dark:text-red-400">
          Failed to load tasks. Please try again later.
        </div>
      </div>
    );
  }
}

