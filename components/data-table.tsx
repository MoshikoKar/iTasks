"use client";

import { useState } from "react";
import Link from "next/link";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { Filter, Search, ExternalLink } from "lucide-react";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const assignees = Array.from(new Set(tasks.map((t) => t.assignee.name)));
  const branches = Array.from(new Set(tasks.map((t) => t.branch).filter(Boolean))) as string[];

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    if (branchFilter !== "all" && task.branch !== branchFilter) return false;
    if (assigneeFilter !== "all" && task.assignee.name !== assigneeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wide">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wide">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wide">Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
          <div className="mt-3 text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredTasks.length}</span> of{" "}
            <span className="font-semibold text-slate-900">{tasks.length}</span> tasks
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">SLA</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Server/App</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Search size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No tasks found</p>
                    <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-2 group"
                      >
                        {task.title}
                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
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
                        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-200">
                          {task.branch}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {task.slaDeadline ? new Date(task.slaDeadline).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {task.context?.serverName || task.context?.application || "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{task.assignee.name}</td>
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

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    Open: "bg-blue-100 text-blue-800 border border-blue-200",
    InProgress: "bg-purple-100 text-purple-800 border border-purple-200",
    PendingVendor: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    PendingUser: "bg-orange-100 text-orange-800 border border-orange-200",
    Resolved: "bg-green-100 text-green-800 border border-green-200",
    Closed: "bg-slate-100 text-slate-800 border border-slate-200",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors: Record<TaskPriority, string> = {
    Low: "bg-green-100 text-green-800 border border-green-200",
    Medium: "bg-blue-100 text-blue-800 border border-blue-200",
    High: "bg-amber-100 text-amber-800 border border-amber-200",
    Critical: "bg-red-100 text-red-800 border border-red-200",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[priority]}`}>{priority}</span>;
}

