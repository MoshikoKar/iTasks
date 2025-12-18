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
        <details className="rounded-xl border border-border bg-card shadow-sm">
          <summary className="cursor-pointer flex items-center gap-2 p-5 font-semibold text-foreground list-none">
            <Filter size={18} className="text-primary" />
            <span>Filters</span>
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              ({filteredTasks.length} of {tasks.length} tasks)
            </span>
          </summary>
          <div className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wide">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
              <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wide">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
              <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wide">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
              <label className="mb-1.5 block text-xs font-semibold text-foreground uppercase tracking-wide">Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">SLA</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Server/App</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Search size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground font-medium mb-2">No tasks found</p>
                    <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or create a new task</p>
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
                    className="hover:bg-primary/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        {task.title}
                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
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
                        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
                          {task.branch}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {task.dueDate ? formatDate(task.dueDate) : "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {task.slaDeadline ? formatDate(task.slaDeadline) : "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {task.context?.serverName || task.context?.application || "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{task.assignee.name}</td>
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


