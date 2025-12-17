"use client";

import { memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { Filter, Search, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTaskFilters } from "@/hooks/useTaskFilters";
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

interface DataTableProps {
  tasks: Task[];
  showFilters?: boolean;
}

export function DataTable({ tasks, showFilters = true }: DataTableProps) {
  const router = useRouter();
  const {
    filteredTasks,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    branchFilter,
    setBranchFilter,
    assigneeFilter,
    setAssigneeFilter,
    uniqueAssignees,
    uniqueBranches,
  } = useTaskFilters(tasks);

  return (
    <div className="space-y-4">
      {showFilters && (
        <details className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-gradient-to-br from-white to-slate-50 dark:from-neutral-800 dark:to-neutral-900 shadow-sm">
          <summary className="cursor-pointer flex items-center gap-2 p-5 font-semibold text-slate-900 dark:text-neutral-100 list-none">
            <Filter size={18} className="text-blue-600 dark:text-blue-400" />
            <span>Filters</span>
            <span className="ml-auto text-xs text-slate-600 dark:text-neutral-400 font-normal">
              ({filteredTasks.length} of {tasks.length} tasks)
            </span>
          </summary>
          <div className="px-5 pb-5">
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
                {uniqueBranches.map((branch) => (
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
                {uniqueAssignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            </div>
          </div>
        </details>
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
            <tbody className="divide-y divide-slate-200 dark:divide-neutral-700">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Search size={48} className="mx-auto text-slate-300 dark:text-neutral-600 mb-3" />
                    <p className="text-slate-600 dark:text-neutral-300 font-medium mb-2">No tasks found</p>
                    <p className="text-sm text-slate-600 dark:text-neutral-400 mb-4">Try adjusting your filters or create a new task</p>
                    <Link 
                      href="/tasks?create=1" 
                      className="neu-button inline-flex items-center justify-center gap-2 text-sm font-medium"
                      style={{ fontSize: '14px', padding: '8px 20px' }}
                    >
                      Create New Task
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        {task.title}
                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="status" value={task.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="priority" value={task.priority} />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


