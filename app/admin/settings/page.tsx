import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSettingsPage } from "@/components/admin-settings-page";

export default async function AdminSettingsPageRoute() {
  try {
    await requireRole([Role.Admin]);
  } catch (error) {
    redirect("/");
  }

  return <AdminSettingsPage />;
}
