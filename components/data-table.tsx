"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { Filter, Search, UserPlus, RefreshCw, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { formatDate } from "@/lib/utils/date";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { CopyButton } from "@/components/ui/copy-button";

// Quick Status Change Component - Single click with next status preview on hover
function QuickStatusChange({
  taskId,
  currentStatus,
  onStatusChange,
  onRefresh
}: {
  taskId: string;
  currentStatus: TaskStatus;
  onStatusChange: (newStatus: TaskStatus) => void;
  onRefresh?: () => void;
}) {
  const [isChanging, setIsChanging] = useState(false);

  // Get next logical status in workflow
  const getNextStatus = (status: TaskStatus): TaskStatus | null => {
    switch (status) {
      case TaskStatus.Open:
        return TaskStatus.InProgress;
      case TaskStatus.InProgress:
        return TaskStatus.Resolved;
      case TaskStatus.PendingVendor:
      case TaskStatus.PendingUser:
        return TaskStatus.InProgress;
      case TaskStatus.Resolved:
        return TaskStatus.Closed;
      case TaskStatus.Closed:
        return null; // No next status for closed tasks
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus(currentStatus);

  const handleStatusChange = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStatus) return;

    setIsChanging(true);

    // Optimistically update the UI immediately
    onStatusChange(nextStatus);

    try {
      const response = await fetch('/api/tasks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: nextStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success(`Status → ${nextStatus}`, {
        duration: 2000,
      });

      // Refresh after a short delay to ensure server has processed the update
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 300);
      }
    } catch (error) {
      // Revert on error
      onStatusChange(currentStatus);
      toast.error('Failed to change status');
    } finally {
      setIsChanging(false);
    }
  };

  if (!nextStatus) return null;

  return (
    <button
      onClick={handleStatusChange}
      className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
      title={`Click to change to: ${nextStatus}`}
      aria-label={`Change status to ${nextStatus}`}
      disabled={isChanging}
    >
      {isChanging ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : (
        <RefreshCw size={16} />
      )}
    </button>
  );
}

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  branch: string | null;
  dueDate: Date | null;
  slaDeadline: Date | null;
  assignee: { name: string; id: string };
  assigneeId: string;
  context: { serverName: string | null; application: string | null } | null;
}

interface DataTableProps {
  tasks: Task[];
  showFilters?: boolean;
  currentUserId?: string;
}

export function DataTable({ tasks, showFilters = true, currentUserId }: DataTableProps) {
  const router = useRouter();
  const [localTasks, setLocalTasks] = useState<Task[]>(() => tasks);
  const [isMounted, setIsMounted] = useState(false);

  // Mark as mounted after hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update local tasks when props change (but only after mount to avoid hydration issues)
  useEffect(() => {
    if (isMounted) {
      setLocalTasks(tasks);
    }
  }, [tasks, isMounted]);

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
    resetFilters,
  } = useTaskFilters(localTasks);

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || branchFilter !== 'all' || assigneeFilter !== 'all';

  // Persist filter panel open/closed state
  const [isFilterOpen, setIsFilterOpen] = useLocalStorage<boolean>('task-filter-panel-open', false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Restore filter panel state on mount
  useEffect(() => {
    if (detailsRef.current && showFilters) {
      detailsRef.current.open = isFilterOpen;
    }
  }, [isFilterOpen, showFilters]);

  // Handle status change with optimistic update
  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setLocalTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  return (
    <div className="space-y-4">
      {showFilters && (
        <details
          ref={detailsRef}
          className="rounded-xl border border-border bg-card shadow-sm"
          onToggle={(e) => {
            setIsFilterOpen((e.target as HTMLDetailsElement).open);
          }}
        >
          <summary className="cursor-pointer flex items-center gap-2 p-5 font-semibold text-foreground list-none">
            <Filter size={18} className="text-primary" />
            <span>Filters</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-normal">
                ({filteredTasks.length} of {isMounted ? localTasks.length : tasks.length} tasks)
              </span>
              {hasActiveFilters && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    resetFilters();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-destructive hover:text-destructive/80 bg-destructive/10 hover:bg-destructive/20 rounded-md transition-colors"
                >
                  <X size={14} />
                  Clear Filters
                </button>
              )}
            </div>
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
                <th className="px-6 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Search size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-foreground font-semibold mb-2">
                      {(isMounted ? localTasks.length : tasks.length) === 0
                        ? "All tasks are under control"
                        : "No matching tasks"}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {(isMounted ? localTasks.length : tasks.length) === 0
                        ? "All tasks are under control - nice work! Ready to create a task?"
                        : "Try adjusting your filters to see more tasks"}
                    </p>
                    {(isMounted ? localTasks.length : tasks.length) === 0 && (
                      <Link
                        href="/tasks?create=1"
                        className="neu-button inline-flex items-center justify-center gap-2 text-sm font-medium"
                        style={{ fontSize: '14px', padding: '8px 20px' }}
                      >
                        Create New Task
                      </Link>
                    )}
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
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={task.id} label="Copy task ID" iconSize={12} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="status" value={task.status} enableHighlight showTooltip />
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="priority" value={task.priority} enableHighlight showTooltip />
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <QuickStatusChange
                          taskId={task.id}
                          currentStatus={task.status}
                          onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                          onRefresh={() => router.refresh()}
                        />
                        {currentUserId && task.assigneeId !== currentUserId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.info('Assign to me - Navigate to task detail to assign');
                            }}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Assign to me"
                            aria-label="Assign task to me"
                          >
                            <UserPlus size={16} />
                          </button>
                        )}
                      </div>
                    </td>
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


