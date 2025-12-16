import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RecurringPageWrapper } from "@/components/recurring-page-wrapper";

/**
 * Build recurring task filter based on user role and permissions
 */
function buildRecurringTaskFilter(user: { id: string; role: Role; teamId: string | null }) {
  switch (user.role) {
    case Role.Admin:
      // Admin sees:
      // 1. Their own recurring tasks
      // 2. Recurring tasks they assigned to users (but not ones users created themselves)
      return {
        OR: [
          { creatorId: user.id },
          {
            AND: [
              { creatorId: user.id },
              { templateAssigneeId: { not: user.id } },
            ],
          },
        ],
      };

    case Role.TeamLead:
      // TeamLead sees:
      // 1. Their own recurring tasks
      // 2. Admin's recurring tasks (will be filtered to exclude ones assigned to admin himself)
      // 3. Recurring tasks they assigned to users (but not ones users created themselves)
      // Note: Admin's recurring tasks assigned to himself are filtered out in the page component
      return {
        OR: [
          { creatorId: user.id },
          { creator: { role: Role.Admin } },
          {
            AND: [
              { creatorId: user.id },
              { templateAssigneeId: { not: user.id } },
            ],
          },
        ],
      };

    case Role.Technician:
    case Role.Viewer:
    default:
      // Regular users see only their own recurring tasks
      return {
        creatorId: user.id,
      };
  }
}

export default async function RecurringTasksPage() {
  const currentUser = await requireAuth();
  if (!currentUser) {
    redirect("/");
  }

  let filter = buildRecurringTaskFilter(currentUser);
  
  // For TeamLead, we need to filter admin's recurring tasks to exclude ones assigned to admin himself
  // Since Prisma doesn't support field-to-field comparison, we'll fetch and filter
  let configs;
  if (currentUser.role === Role.TeamLead) {
    // Fetch all configs that match the filter
    const allConfigs = await db.recurringTaskConfig.findMany({
      where: {
        OR: [
          { creatorId: currentUser.id },
          { creator: { role: Role.Admin } },
          {
            AND: [
              { creatorId: currentUser.id },
              { templateAssigneeId: { not: currentUser.id } },
            ],
          },
        ],
      },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, createdAt: true },
        },
        templateAssignee: { select: { name: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { name: "asc" },
    });
    
    // Filter out admin's recurring tasks that admin assigned to himself
    configs = allConfigs.filter(config => {
      // If it's admin's recurring task, only include if assigned to someone else
      if (config.creator?.role === Role.Admin) {
        return config.templateAssigneeId !== config.creatorId;
      }
      // Include all other configs
      return true;
    });
  } else {
    // For other roles, use the standard filter
    configs = await db.recurringTaskConfig.findMany({
      where: filter,
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, createdAt: true },
        },
        templateAssignee: { select: { name: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  const [users] = await Promise.all([
    // For assignee selection, filter based on user role
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

  return <RecurringPageWrapper configs={configs} users={users} currentUser={currentUser} />;
}

