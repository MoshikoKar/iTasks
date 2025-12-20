"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, Circle } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";

interface DashboardClientProps {
  initialCountdown?: number;
}

export function DashboardClient({ initialCountdown = 120 }: DashboardClientProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(initialCountdown);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const refresh = useCallback(() => {
    router.refresh();
    setCountdown(120);
    setJustRefreshed(true);
    // Hide "just refreshed" indicator after 3 seconds
    setTimeout(() => setJustRefreshed(false), 3000);
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
    <div className="text-sm text-slate-500 dark:text-neutral-400 flex flex-col items-end gap-1">
      {justRefreshed && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 animate-pulse">
          <Circle size={8} fill="currentColor" />
          <span>Updated just now</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Circle size={6} className="text-green-500 animate-pulse" fill="currentColor" />
          <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
        </div>
        <Clock className="inline" size={14} />
        <span>Auto-refresh: {countdown}s</span>
      </div>
      <div className="text-xs text-slate-400 dark:text-neutral-500">
        Press F5 to refresh
      </div>
    </div>
  );
}
