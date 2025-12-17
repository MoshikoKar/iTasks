import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { ClientWrapper } from "@/components/ClientWrapper";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'iTasks',
  description: 'IT Task Management System',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-900 dark:text-neutral-100" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="theme">
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Skip to main content
          </a>
          <ClientWrapper>
            {user ? (
              <div className="flex h-screen w-full overflow-hidden">
                <Sidebar userRole={user.role} userName={user.name} />
                <main id="main-content" className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-neutral-900 p-6">
                  {children}
                </main>
              </div>
            ) : (
              <main id="main-content" className="p-6">{children}</main>
            )}
          </ClientWrapper>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

