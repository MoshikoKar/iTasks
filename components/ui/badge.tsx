'use client';

import { clsx } from 'clsx';
import { CheckCircle, Clock, AlertCircle, XCircle, Circle } from 'lucide-react';

export type TaskStatus = 'Open' | 'InProgress' | 'PendingVendor' | 'PendingUser' | 'Resolved' | 'Closed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

interface BadgeProps {
  variant?: 'status' | 'priority';
  value: TaskStatus | TaskPriority;
  className?: string;
}

const statusConfig: Record<TaskStatus, { colors: string; icon: React.ReactNode; label: string }> = {
  Open: {
    colors: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: <Circle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Task status: Open',
  },
  InProgress: {
    colors: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: <Clock size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Task status: In Progress',
  },
  PendingVendor: {
    colors: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: <AlertCircle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Task status: Pending Vendor',
  },
  PendingUser: {
    colors: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    icon: <AlertCircle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Task status: Pending User',
  },
  Resolved: {
    colors: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    icon: <CheckCircle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Task status: Resolved',
  },
  Closed: {
    colors: 'bg-slate-100 dark:bg-neutral-700 text-slate-800 dark:text-neutral-200 border-slate-200 dark:border-neutral-600',
    icon: <XCircle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Task status: Closed',
  },
};

const priorityConfig: Record<TaskPriority, { colors: string; icon: React.ReactNode; label: string }> = {
  Low: {
    colors: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    icon: <Circle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Priority: Low',
  },
  Medium: {
    colors: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: <Circle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Priority: Medium',
  },
  High: {
    colors: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: <AlertCircle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Priority: High',
  },
  Critical: {
    colors: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
    icon: <AlertCircle size={12} className="inline mr-1" aria-hidden="true" />,
    label: 'Priority: Critical',
  },
};

export function Badge({ variant = 'status', value, className }: BadgeProps) {
  const config = variant === 'status' 
    ? statusConfig[value as TaskStatus]
    : priorityConfig[value as TaskPriority];

  return (
    <span
      role="status"
      aria-label={config.label}
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        config.colors,
        className
      )}
    >
      {config.icon}
      {value}
    </span>
  );
}
