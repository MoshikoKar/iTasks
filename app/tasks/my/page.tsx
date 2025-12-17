"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const user = await res.json();
          // Check if user has permission to view My Tasks (not Viewer role)
          if (user.role === "Viewer") {
            router.replace("/");
            return;
          }
          setUserId(user.id);
        } else if (res.status === 401) {
          router.replace("/login");
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to get user:", error);
        router.replace("/login");
        setLoading(false);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    if (userId) {
      fetch(`/api/tasks?assigneeId=${userId}`)
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 401) router.replace("/login");
            throw new Error("Failed to fetch tasks");
          }
          return res.json();
        })
        .then((data) => {
          setTasks(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to fetch tasks:", error);
          setLoading(false);
        });
    }
  }, [router, userId]);

  if (loading) {
    return <div className="p-6 text-slate-600 dark:text-neutral-400">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">My Tasks</h1>
      <DataTable tasks={tasks} showFilters={true} />
    </div>
  );
}

