"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";

interface DashboardClientProps {
  initialCountdown?: number;
}

export function DashboardClient({ initialCountdown = 120 }: DashboardClientProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(initialCountdown);

  const refresh = useCallback(() => {
    router.refresh();
    setCountdown(120);
  }, [router]);

  // Use polling hook for auto-refresh (120 seconds / 2 minutes)
  usePolling(refresh, 120000, true);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 120; // Reset to 120 when it reaches 0
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // F5 keyboard shortcut for manual refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        refresh();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [refresh]);

  return (
    <div className="text-sm text-slate-500 dark:text-neutral-400 flex flex-col items-end">
      <div>
        <Clock className="inline mr-1" size={14} />
        Auto-refresh: 120s
        <span className="ml-2 font-medium text-slate-700 dark:text-neutral-300">({countdown}s)</span>
      </div>
      <div className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
        Press F5 to refresh
      </div>
    </div>
  );
}
