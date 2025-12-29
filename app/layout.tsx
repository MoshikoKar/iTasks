import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { ClientWrapper } from "@/components/ClientWrapper";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/footer";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'iTasks',
  description: 'IT Task Management System',
};

// Cache system config with 5 minute TTL (300 seconds)
const getCachedSystemConfig = unstable_cache(
  async () => {
    return await db.systemConfig.findUnique({
      where: { id: "system" },
      select: { 
        supportEmail: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
      },
    });
  },
  ['system-config'],
  {
    revalidate: 300, // 5 minutes
    tags: ['system-config'],
  }
);

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  // Check if bootstrap is needed (no admin users exist)
  const adminCount = await db.user.count({
    where: { role: "Admin" },
  });

  const needsBootstrap = adminCount === 0;

  // Fetch system config settings (cached)
  let supportEmail: string | null = null;
  let timezone: string | null = null;
  let dateFormat: string | null = null;
  let timeFormat: string | null = null;
  try {
    const config = await getCachedSystemConfig();
    supportEmail = config?.supportEmail || null;
    timezone = config?.timezone || null;
    dateFormat = config?.dateFormat || null;
    timeFormat = config?.timeFormat || null;
  } catch (error) {
    console.error("Failed to fetch system config:", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-900 dark:text-neutral-100 flex flex-col" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="theme">
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Skip to main content
          </a>
          <ClientWrapper>
            {needsBootstrap ? (
              // Bootstrap mode - show registration screen
              <div className="flex flex-col min-h-screen overflow-hidden">
                <main id="main-content" className="flex-1 p-4 overflow-y-auto overflow-x-hidden">{children}</main>
                <Footer
                  supportEmail={supportEmail}
                  timezone={timezone}
                  dateFormat={dateFormat}
                  timeFormat={timeFormat}
                />
              </div>
            ) : user ? (
              // Normal authenticated layout
              <div className="flex h-screen w-full overflow-hidden flex-col">
                <Header userId={user.id} />
                <div className="flex flex-1 overflow-hidden relative">
                  <Sidebar userRole={user.role} userName={user.name} />
                  <main id="main-content" className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden bg-white dark:bg-neutral-900 main-content-area w-full md:w-auto">
                    <div className="flex-1 p-3 sm:p-4 md:p-6 w-full max-w-full min-w-0">
                      {children}
                    </div>
                    <Footer
                      supportEmail={supportEmail}
                      timezone={timezone}
                      dateFormat={dateFormat}
                      timeFormat={timeFormat}
                    />
                  </main>
                </div>
              </div>
            ) : (
              // Normal unauthenticated layout (login page)
              <div className="flex flex-col min-h-screen overflow-hidden">
                <main id="main-content" className="flex-1 p-4 overflow-y-auto overflow-x-hidden">{children}</main>
                <Footer
                  supportEmail={supportEmail}
                  timezone={timezone}
                  dateFormat={dateFormat}
                  timeFormat={timeFormat}
                />
              </div>
            )}
          </ClientWrapper>
          {/* Desktop Toaster */}
          <div className="hidden md:block">
            <Toaster position="top-right" richColors />
          </div>
          {/* Mobile Toaster */}
          <div className="block md:hidden">
            <Toaster position="top-center" richColors />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

