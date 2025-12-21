import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { useLocalStorage } from './useLocalStorage';

interface Task {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
  branch: string | null;
  assignee: { name: string };
  dueDate?: Date | null;
  slaDeadline?: Date | null;
}

interface UseTaskFiltersReturn<T extends Task> {
  filteredTasks: T[];
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  branchFilter: string;
  setBranchFilter: (value: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (value: string) => void;
  uniqueAssignees: string[];
  uniqueBranches: string[];
  resetFilters: () => void;
}

/**
 * Custom hook for task filtering logic
 * @param tasks - Array of tasks to filter
 * @returns Filtered tasks and filter controls
 */
export function useTaskFilters<T extends Task>(tasks: T[]): UseTaskFiltersReturn<T> {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const priorityParam = searchParams.get('priority');
  const branchParam = searchParams.get('branch');
  const assigneeParam = searchParams.get('assignee');
  const overdueParam = searchParams.get('overdue');
  const slaBreachParam = searchParams.get('slaBreach');

  // Use localStorage to persist filter preferences
  const [statusFilter, setStatusFilter] = useLocalStorage<string>('task-filter-status', statusParam || 'all');
  const [priorityFilter, setPriorityFilter] = useLocalStorage<string>('task-filter-priority', priorityParam || 'all');
  const [branchFilter, setBranchFilter] = useLocalStorage<string>('task-filter-branch', branchParam || 'all');
  const [assigneeFilter, setAssigneeFilter] = useLocalStorage<string>('task-filter-assignee', assigneeParam || 'all');

  // Update filters when URL params change (URL params take precedence)
  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    if (priorityParam) {
      setPriorityFilter(priorityParam);
    }
    if (branchParam) {
      setBranchFilter(branchParam);
      // Clear assignee filter when branch filter is set from URL
      setAssigneeFilter('all');
    }
    if (assigneeParam) {
      setAssigneeFilter(assigneeParam);
      // Clear branch filter when assignee filter is set from URL
      setBranchFilter('all');
    }
  }, [statusParam, priorityParam, branchParam, assigneeParam, setStatusFilter, setPriorityFilter, setBranchFilter, setAssigneeFilter]);

  // Extract unique assignees
  const uniqueAssignees = useMemo(() => 
    Array.from(new Set(tasks.map(t => t.assignee.name))),
    [tasks]
  );

  // Extract unique branches
  const uniqueBranches = useMemo(() => 
    Array.from(new Set(tasks.map(t => t.branch).filter(Boolean))) as string[],
    [tasks]
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(task => {
      // Handle status filter - treat "Open" as all non-resolved/closed statuses
      if (statusFilter !== 'all') {
        if (statusFilter === 'Open') {
          // "Open" means all tasks that are not Resolved or Closed
          if (task.status === TaskStatus.Resolved || task.status === TaskStatus.Closed) return false;
        } else {
          // Exact status match for other statuses
          if (task.status !== statusFilter) return false;
        }
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (branchFilter !== 'all' && task.branch !== branchFilter) return false;
      if (assigneeFilter !== 'all' && task.assignee.name !== assigneeFilter) return false;
      
      // Handle overdue filter
      if (overdueParam === '1') {
        if (!task.dueDate || task.dueDate >= now) return false;
        if (task.status === TaskStatus.Resolved || task.status === TaskStatus.Closed) return false;
      }
      
      // Handle SLA breach filter
      if (slaBreachParam === '1') {
        if (!task.slaDeadline || task.slaDeadline >= now) return false;
        if (task.status === TaskStatus.Resolved || task.status === TaskStatus.Closed) return false;
      }
      
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, branchFilter, assigneeFilter, overdueParam, slaBreachParam]);

  const resetFilters = useCallback(() => {
    // Clear localStorage filter keys
    if (typeof window !== 'undefined') {
      localStorage.removeItem('task-filter-status');
      localStorage.removeItem('task-filter-priority');
      localStorage.removeItem('task-filter-branch');
      localStorage.removeItem('task-filter-assignee');
      
      // Always do a full page reload to ensure complete reset
      // This guarantees localStorage is cleared, state is fresh, and URL is clean
      window.location.href = '/tasks';
    }
  }, []);

  return {
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
  };
}
