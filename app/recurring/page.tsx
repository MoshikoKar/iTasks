import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RecurringPageWrapper } from "@/components/recurring-page-wrapper";

export default async function RecurringTasksPage() {
  try {
    await requireRole([Role.Admin, Role.TeamLead]);
  } catch (error) {
    redirect("/");
  }

  const [configs, users] = await Promise.all([
    db.recurringTaskConfig.findMany({
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, createdAt: true },
        },
        templateAssignee: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <RecurringPageWrapper configs={configs} users={users} />;
}

