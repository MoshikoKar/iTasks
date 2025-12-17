'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    // Check if create=1 is in the URL query params
    if (searchParams.get('create') === '1') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    // Remove create=1 from URL if present
    if (searchParams.get('create') === '1') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('create');
      router.replace(`/tasks${params.toString() ? `?${params.toString()}` : ''}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">All Tasks</h1>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2"
          style={{ padding: '10px 20px' }}
        >
          <Plus size={20} />
          Create Task
        </Button>
      </div>

      <DataTable tasks={tasks} showFilters={showFilters} />

      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        title="Create New Task"
        size="lg"
      >
        <CreateTaskForm
          currentUserId={currentUser.id}
          users={users}
          onSuccess={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
