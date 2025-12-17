'use client';

import { useState } from 'react';
import { TaskStatus } from '@prisma/client';
import { Button } from './button';

interface StatusChangeButtonsProps {
  currentStatus: TaskStatus;
  taskId: string;
  changeStatus: (formData: FormData) => Promise<void>;
}

export function StatusChangeButtons({ currentStatus, taskId, changeStatus }: StatusChangeButtonsProps) {
  const [changingStatus, setChangingStatus] = useState<TaskStatus | null>(null);

  const getStatusTextColorClass = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Open:
        return 'text-blue-800 dark:text-blue-300';
      case TaskStatus.InProgress:
        return 'text-purple-800 dark:text-purple-300';
      case TaskStatus.PendingVendor:
        return 'text-amber-800 dark:text-amber-300';
      case TaskStatus.PendingUser:
        return 'text-orange-800 dark:text-orange-300';
      case TaskStatus.Resolved:
        return 'text-green-800 dark:text-green-300';
      case TaskStatus.Closed:
        return 'text-slate-800 dark:text-neutral-300';
      default:
        return 'text-slate-800 dark:text-neutral-300';
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    setChangingStatus(status);
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('status', status);
    try {
      await changeStatus(formData);
    } catch (error) {
      console.error('Error changing status:', error);
    } finally {
      setChangingStatus(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {Object.values(TaskStatus).map((status) => (
        <form key={status} action={changeStatus}>
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="status" value={status} />
          <Button
            type="submit"
            variant={currentStatus === status ? 'primary' : 'secondary'}
            size="sm"
            isLoading={changingStatus === status}
            disabled={changingStatus !== null || currentStatus === status}
            aria-label={`Set status to ${status}`}
            onClick={(e) => {
              e.preventDefault();
              handleStatusChange(status);
            }}
          >
            <span className={getStatusTextColorClass(status)}>{status}</span>
          </Button>
        </form>
      ))}
    </div>
  );
}
