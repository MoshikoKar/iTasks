'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from './button';
import { DataTable } from './data-table';
import { Pagination } from './pagination';
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
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
}

export function TasksPageWrapper({
  tasks,
  currentUser,
  users,
  showFilters = true,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
}: TasksPageWrapperProps) {
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

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    router.push(`/tasks${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Header - Responsive Layout */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-neutral-100">All Tasks</h1>
          {totalCount > 0 && (
            <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1">
              Showing {((currentPage - 1) * 50) + 1}-{Math.min(currentPage * 50, totalCount)} of {totalCount} tasks
            </p>
          )}
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full gap-2"
            style={{ padding: '10px 20px' }}
          >
            <Plus size={20} />
            Create Task
          </Button>
        </div>
      </div>

      <DataTable tasks={tasks} showFilters={showFilters} currentUserId={currentUser.id} />

      {totalPages > 1 && (
        <div className="flex justify-center pt-4 px-4 md:px-0">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

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
