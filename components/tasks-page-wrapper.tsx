'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from './button';
import { DataTable } from './data-table';
import { User } from '@prisma/client';

const Modal = dynamic(() => import('./modal').then(mod => ({ default: mod.Modal })), {
  ssr: false,
});
const CreateTaskForm = dynamic(() => import('./create-task-form').then(mod => ({ default: mod.CreateTaskForm })), {
  ssr: false,
});

interface TasksPageWrapperProps {
  tasks: any[];
  currentUser: { id: string; name: string };
  users: Pick<User, 'id' | 'name'>[];
  showFilters?: boolean;
}

export function TasksPageWrapper({ tasks, currentUser, users, showFilters = true }: TasksPageWrapperProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">All Tasks</h1>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2"
        >
          <Plus size={20} />
          Create Task
        </Button>
      </div>

      <DataTable tasks={tasks} showFilters={showFilters} />

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Task"
        size="lg"
      >
        <CreateTaskForm
          currentUserId={currentUser.id}
          users={users}
          onSuccess={() => setIsCreateModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
