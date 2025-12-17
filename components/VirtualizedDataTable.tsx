"use client";

import { useState, useMemo, memo, useRef } from "react";
import Link from "next/link";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { Filter, Search, ExternalLink } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDate } from "@/lib/utils/date";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  branch: string | null;
  dueDate: Date | null;
  slaDeadline: Date | null;
  assignee: { name: string };
  context: { serverName: string | null; application: string | null } | null;
}

interface VirtualizedDataTableProps {
  tasks: Task[];
  showFilters?: boolean;
}

export function VirtualizedDataTable({ tasks, showFilters = true }: VirtualizedDataTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const parentRef = useRef<HTMLDivElement>(null);

  const assignees = useMemo(() =>
    Array.from(new Set(tasks.map((t) => t.assignee.name))),
    [tasks]
  );

  const branches = useMemo(() =>
    Array.from(new Set(tasks.map((t) => t.branch).filter(Boolean))) as string[],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (branchFilter !== "all" && task.branch !== branchFilter) return false;
      if (assigneeFilter !== "all" && task.assignee.name !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, branchFilter, assigneeFilter]);

  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-gradient-to-br from-white to-slate-50 dark:from-neutral-800 dark:to-neutral-700/50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-900 dark:text-neutral-100">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wide">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              >
                <option value="all">All Statuses</option>
                {Object.values(TaskStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wide">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              >
                <option value="all">All Priorities</option>
                {Object.values(TaskPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wide">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-neutral-300 uppercase tracking-wide">Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              >
                <option value="all">All Assignees</option>
                {assignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-neutral-400">
            Showing <span className="font-semibold text-slate-900 dark:text-neutral-100">{filteredTasks.length}</span> of{" "}
            <span className="font-semibold text-slate-900 dark:text-neutral-100">{tasks.length}</span> tasks
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-neutral-700 dark:to-neutral-800 border-b border-slate-200 dark:border-neutral-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">SLA</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">Server/App</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-neutral-200 uppercase tracking-wider">Assignee</th>
              </tr>
            </thead>
          </table>
          <div ref={parentRef} className="max-h-[600px] overflow-auto">
            {filteredTasks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Search size={48} className="mx-auto text-slate-300 dark:text-neutral-600 mb-3" />
                <p className="text-slate-500 dark:text-neutral-400 font-medium">No tasks found</p>
                <p className="text-sm text-slate-400 dark:text-neutral-500 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                <table className="min-w-full text-sm">
                  <tbody>
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const task = filteredTasks[virtualRow.index];
                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-slate-50 dark:hover:bg-neutral-700/50 transition-colors group border-b border-slate-200 dark:border-neutral-700"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="font-medium text-slate-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                            >
                              {task.title}
                              <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400" />
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={task.status} />
                          </td>
                          <td className="px-6 py-4">
                            <PriorityBadge priority={task.priority} />
                          </td>
                          <td className="px-6 py-4">
                            {task.branch ? (
                              <span className="inline-flex rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {task.branch}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-neutral-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">
                            {task.dueDate ? formatDate(task.dueDate) : "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">
                            {task.slaDeadline ? formatDate(task.slaDeadline) : "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-neutral-300">
                            {task.context?.serverName || task.context?.application || "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-neutral-300 font-medium">{task.assignee.name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StatusBadge = memo(function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    Open: "bg-blue-500 dark:bg-blue-600 text-white border border-blue-600 dark:border-blue-700",
    InProgress: "bg-purple-500 dark:bg-purple-600 text-white border border-purple-600 dark:border-purple-700",
    PendingVendor: "bg-amber-500 dark:bg-amber-600 text-white border border-amber-600 dark:border-amber-700",
    PendingUser: "bg-orange-500 dark:bg-orange-600 text-white border border-orange-600 dark:border-orange-700",
    Resolved: "bg-green-500 dark:bg-green-600 text-white border border-green-600 dark:border-green-700",
    Closed: "bg-slate-500 dark:bg-neutral-600 text-white border border-slate-600 dark:border-neutral-700",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>{status}</span>;
});

const PriorityBadge = memo(function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors: Record<TaskPriority, string> = {
    Low: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800",
    Medium: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    High: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    Critical: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[priority]}`}>{priority}</span>;
});
