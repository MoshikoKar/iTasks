import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole([Role.Admin]);
  } catch {
    redirect("/");
  }
  return <>{children}</>;
}
