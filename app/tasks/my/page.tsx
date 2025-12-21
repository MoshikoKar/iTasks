"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  const fetchTasks = async (cursor?: string) => {
    const url = cursor
      ? `/api/tasks?assigneeId=${userId}&cursor=${cursor}&limit=50`
      : `/api/tasks?assigneeId=${userId}&limit=50`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401) router.replace("/login");
      throw new Error("Failed to fetch tasks");
    }

    const data = await res.json();

    if (cursor) {
      // Append to existing tasks
      setTasks(prev => [...prev, ...data.tasks]);
    } else {
      // Replace tasks
      setTasks(data.tasks);
    }

    setNextCursor(data.pagination?.nextCursor || null);
    setHasNextPage(data.pagination?.hasNextPage || false);
  };

  useEffect(() => {
    if (userId) {
      fetchTasks().finally(() => setLoading(false));
    }
  }, [userId]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      await fetchTasks(nextCursor);
    } catch (error) {
      console.error("Failed to load more tasks:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-600 dark:text-neutral-400">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">My Tasks</h1>
      <DataTable tasks={tasks} showFilters={true} currentUserId={userId} />
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading...' : 'Load More Tasks'}
          </button>
        </div>
      )}
    </div>
  );
}

