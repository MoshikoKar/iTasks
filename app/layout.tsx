import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'iTasks',
  description: 'IT Task Management System',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning>
        {user ? (
          <div className="flex h-screen w-full overflow-hidden">
            <Sidebar userRole={user.role} userName={user.name} />
            <main className="flex flex-1 flex-col overflow-y-auto bg-white p-6 dark:bg-neutral-900">
              {children}
            </main>
          </div>
        ) : (
          <main className="p-6">{children}</main>
        )}
      </body>
    </html>
  );
}

