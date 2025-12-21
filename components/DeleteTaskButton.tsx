'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { useRouter } from 'next/navigation';

interface DeleteTaskButtonProps {
  taskId: string;
  taskTitle: string;
  deleteTaskAction: (formData: FormData) => Promise<void>;
}

export function DeleteTaskButton({ taskId, taskTitle, deleteTaskAction }: DeleteTaskButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDeleting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await deleteTaskAction(formData);
    } catch (error) {
      console.error('Error deleting task:', error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1 text-destructive"
      >
        <Trash2 size={14} className="shrink-0 text-destructive" aria-hidden="true" />
        <span className="text-destructive">Delete Task</span>
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isDeleting && setIsModalOpen(false)}
        title="Delete Task"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-neutral-400">
            Are you sure you want to delete <strong className="text-slate-900 dark:text-neutral-100">"{taskTitle}"</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <form onSubmit={handleDelete}>
              <input type="hidden" name="taskId" value={taskId} />
              <Button
                type="submit"
                variant="danger"
                isLoading={isDeleting}
                disabled={isDeleting}
                className="text-destructive"
              >
                <span className="text-destructive">Delete</span>
              </Button>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}
