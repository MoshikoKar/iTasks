"use client";

import React, { useState } from "react";
import { Sidebar as SidebarUI, SidebarBody, SidebarLink } from "./ui/sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import Image from "next/image";
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  Shield,
  Repeat,
  BarChart3,
  Settings,
  LogOut,
  Users,
  FileText,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: [Role.Admin, Role.TeamLead, Role.Technician, Role.Viewer] },
  { href: "/tasks", label: "All Tasks", icon: ListTodo, roles: [Role.Admin, Role.TeamLead, Role.Technician, Role.Viewer] },
  { href: "/sla", label: "SLA & Exceptions", icon: Shield, roles: [Role.Admin, Role.TeamLead] },
  { href: "/recurring", label: "Recurring Tasks", icon: Repeat, roles: [Role.Admin, Role.TeamLead] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: [Role.Admin, Role.TeamLead] },
  { href: "/contact", label: "Contact Support", icon: MessageSquare, roles: [Role.Admin, Role.TeamLead, Role.Technician, Role.Viewer] },
  { href: "/admin", label: "Admin", icon: Settings, roles: [Role.Admin] },
];

const subItems: Array<{
  href: string;
  label: string;
  icon: any;
  roles: Role[];
  parent: string;
}> = [
  { href: "/tasks/my", label: "My Tasks", icon: CheckSquare, roles: [Role.Admin, Role.TeamLead, Role.Technician], parent: "/tasks" },
  { href: "/admin/users", label: "Users & Teams", icon: Users, roles: [Role.Admin], parent: "/admin" },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: [Role.Admin], parent: "/admin" },
  { href: "/admin/logs", label: "Logs", icon: FileText, roles: [Role.Admin], parent: "/admin" },
];

export function Sidebar({ userRole, userName }: { userRole: Role; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const visibleItems = items.filter((item) => item.roles.includes(userRole));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Use full page reload to ensure server-side layout re-renders without auth state
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const links = visibleItems.map((item) => {
    const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
    const Icon = item.icon;
    return {
      label: item.label,
      href: item.href,
      icon: (
        <Icon
          size={20}
          className={cn(
            "h-5 w-5 shrink-0",
            active ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200"
          )}
        />
      ),
    };
  });

  return (
    <SidebarUI open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {visibleItems.map((item, idx) => {
              const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              const Icon = item.icon;
              const visibleSubItems = subItems.filter(
                (subItem) => subItem.parent === item.href && subItem.roles.includes(userRole)
              );
              const hasSubItems = visibleSubItems.length > 0 && active && open;

              return (
                <div key={idx}>
                  <SidebarLink
                    link={{
                      label: item.label,
                      href: item.href,
                      icon: (
                        <Icon
                          size={20}
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-blue-600 dark:text-blue-400" : "text-neutral-700 dark:text-neutral-200"
                          )}
                        />
                      ),
                    }}
                  />
                  {hasSubItems && (
                    <div className="ml-6 mt-1 flex flex-col gap-1">
                      {visibleSubItems.map((subItem, subIdx) => {
                        const subActive = pathname === subItem.href || pathname?.startsWith(subItem.href);
                        const SubIcon = subItem.icon;
                        return (
                          <SidebarLink
                            key={subIdx}
                            link={{
                              label: subItem.label,
                              href: subItem.href,
                              icon: (
                                <SubIcon
                                  size={18}
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    subActive ? "text-blue-600 dark:text-blue-400" : "text-neutral-600 dark:text-neutral-300"
                                  )}
                                />
                              ),
                            }}
                            className={cn(
                              subActive && "rounded-md bg-neutral-200 dark:bg-neutral-700"
                            )}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <motion.div
            animate={{
              display: open ? "block" : "none",
              opacity: open ? 1 : 0,
            }}
            className="mb-2 flex-1"
          />
          <SidebarLink
            link={{
              label: userName,
              href: "#",
              icon: (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-xs font-semibold text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              ),
            }}
          />
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 py-2 text-sm text-neutral-700 transition duration-150 hover:text-red-600 dark:text-neutral-200 dark:hover:text-red-400"
          >
            <LogOut size={20} className="h-5 w-5 shrink-0" />
            <motion.span
              animate={{
                display: open ? "inline-block" : "none",
                opacity: open ? 1 : 0,
              }}
              className="!m-0 inline-block whitespace-pre !p-0"
            >
              Logout
            </motion.span>
          </button>
        </div>
      </SidebarBody>
    </SidebarUI>
  );
}

export const Logo = () => {
  return (
    <div className="relative z-20 flex items-center py-1 w-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center"
      >
        <img
          src="/itasks_logo.png"
          alt="iTasks"
          className="h-10 w-auto object-contain"
          style={{ maxWidth: '140px' }}
        />
      </motion.div>
    </div>
  );
};

export const LogoIcon = () => {
  return (
    <div className="relative z-20 flex items-center justify-center py-1">
      <Image
        src="/favicon.png"
        alt="iTasks"
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
        priority
      />
    </div>
  );
};

