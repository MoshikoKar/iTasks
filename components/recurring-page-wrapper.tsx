'use client';

import { useState } from 'react';
import { TaskStatus, TaskPriority, User } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Repeat, Plus, Calendar, Clock, AlertTriangle, Edit, ExternalLink, User as UserIcon, Trash2, Eye, Play } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Button } from './button';

const Modal = dynamic(() => import('./modal').then(mod => ({ default: mod.Modal })), {
  ssr: false,
});
const RecurringTaskForm = dynamic(() => import('./recurring-task-form').then(mod => ({ default: mod.RecurringTaskForm })), {
  ssr: false,
});

interface RecurringConfig {
  id: string;
  name: string;
  cron: string;
  templateTitle: string;
  templateDescription: string | null;
  templatePriority: TaskPriority;
  templateAssigneeId: string;
  templateBranch: string | null;
  templateServerName: string | null;
  templateApplication: string | null;
  templateIpAddress: string | null;
  lastGeneratedAt: Date | null;
  nextGenerationAt: Date | null;
  tasks: Array<{
    id: string;
    status: TaskStatus;
    createdAt: Date;
  }>;
  templateAssignee: {
    name: string;
  };
}

interface RecurringPageWrapperProps {
  configs: RecurringConfig[];
  users: Pick<User, 'id' | 'name'>[];
  currentUser: { id: string; role: string };
}

export function RecurringPageWrapper({ configs, users, currentUser }: RecurringPageWrapperProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<RecurringConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [runningConfigId, setRunningConfigId] = useState<string | null>(null);

  const handleEdit = (config: RecurringConfig) => {
    setSelectedConfig(config);
    setIsEditModalOpen(true);
  };

  const handleView = (config: RecurringConfig) => {
    setSelectedConfig(config);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (config: RecurringConfig) => {
    setSelectedConfig(config);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedConfig) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recurring/${selectedConfig.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setIsDeleteModalOpen(false);
        setSelectedConfig(null);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete recurring task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRunNow = async (config: RecurringConfig) => {
    setRunningConfigId(config.id);
    try {
      const response = await fetch(`/api/recurring/${config.id}/run`, {
        method: 'POST',
      });
      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to run recurring task:', error);
    } finally {
      setRunningConfigId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Repeat size={28} className="text-primary" />
            Recurring Tasks
          </h1>
          <p className="mt-1 text-muted-foreground">Manage automated task generation schedules</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2"
        >
          <Plus size={18} />
          Create Recurring Task
        </Button>
      </div>

      {configs.length === 0 ? (
        <div className="card-base p-12 text-center">
          <Repeat size={64} className="mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No recurring tasks configured</h3>
          <p className="text-muted-foreground mb-6">Get started by creating your first recurring task configuration</p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus size={18} />
            Create Your First Recurring Task
          </Button>
        </div>
      ) : (
        <div className="card-base overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Last Run</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Next Run</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Last Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {configs.map((config) => {
                const lastTask = config.tasks[0];
                const isLastTaskIncomplete = lastTask && lastTask.status !== TaskStatus.Resolved && lastTask.status !== TaskStatus.Closed;
                const nextRun = config.nextGenerationAt ? new Date(config.nextGenerationAt) : null;
                const isOverdue = nextRun && nextRun < new Date();

                return (
                  <tr key={config.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Repeat size={16} className="text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{config.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={14} className="text-muted-foreground/70" />
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">{config.cron}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-muted-foreground/70" />
                        {config.lastGeneratedAt ? formatDateTime(config.lastGeneratedAt) : <span className="text-muted-foreground/70">Never</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isOverdue ? (
                        <div className="flex items-center gap-2 text-destructive font-semibold">
                          <AlertTriangle size={16} />
                          {nextRun ? formatDateTime(nextRun) : <span className="text-muted-foreground/70">Not scheduled</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock size={14} className="text-muted-foreground/70" />
                          {nextRun ? formatDateTime(nextRun) : <span className="text-muted-foreground/70">Not scheduled</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {lastTask ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge status={lastTask.status} />
                          {isLastTaskIncomplete && (
                            <div className="flex items-center gap-1 text-xs text-destructive font-semibold">
                              <AlertTriangle size={12} />
                              Incomplete
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70 text-xs">No instances</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserIcon size={14} className="text-muted-foreground/70" />
                        <span className="font-medium">{config.templateAssignee.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunNow(config)}
                          disabled={runningConfigId === config.id}
                          className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline text-xs font-medium transition-colors disabled:opacity-50"
                          title="Run this recurring task now (creates a task immediately)"
                          aria-label="Run recurring task now"
                        >
                          <Play size={14} className="text-green-600 dark:text-green-400" aria-hidden="true" />
                          {runningConfigId === config.id ? 'Running...' : 'Run Now'}
                        </button>
                        <button
                          onClick={() => handleView(config)}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline text-xs font-medium transition-colors"
                          aria-label="View recurring task"
                        >
                          <Eye size={14} className="text-muted-foreground" aria-hidden="true" />
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(config)}
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-xs font-medium transition-colors"
                          aria-label="Edit recurring task"
                        >
                          <Edit size={14} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(config)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive/80 hover:underline text-xs font-medium transition-colors"
                          aria-label="Delete recurring task"
                        >
                          <Trash2 size={14} className="text-destructive" aria-hidden="true" />
                          <span className="text-destructive">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Recurring Task"
        size="lg"
      >
        <RecurringTaskForm
          users={users}
          currentUser={currentUser}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            router.refresh();
          }}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedConfig(null);
        }}
        title="Edit Recurring Task"
        size="lg"
      >
        {selectedConfig && (
          <RecurringTaskForm
            users={users}
            currentUser={currentUser}
            config={selectedConfig}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setSelectedConfig(null);
              router.refresh();
            }}
          />
        )}
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedConfig(null);
        }}
        title="Recurring Task Details"
        size="lg"
      >
        {selectedConfig && (
          <div className="space-y-6">
            {/* Config Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Name</label>
                  <p className="text-foreground font-semibold">{selectedConfig.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Assignee</label>
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-muted-foreground/70" />
                    <p className="text-foreground">{selectedConfig.templateAssignee.name}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Schedule (Cron)</label>
                  <code className="text-sm bg-muted px-3 py-1 rounded font-mono text-foreground">{selectedConfig.cron}</code>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Priority</label>
                  <PriorityBadge priority={selectedConfig.templatePriority} />
                </div>
              </div>

              {(selectedConfig.templateBranch || selectedConfig.templateServerName || selectedConfig.templateApplication || selectedConfig.templateIpAddress) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedConfig.templateBranch && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Branch</label>
                      <p className="text-foreground">{selectedConfig.templateBranch}</p>
                    </div>
                  )}
                  {selectedConfig.templateServerName && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Server Name</label>
                      <p className="text-foreground">{selectedConfig.templateServerName}</p>
                    </div>
                  )}
                  {selectedConfig.templateApplication && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Application</label>
                      <p className="text-foreground">{selectedConfig.templateApplication}</p>
                    </div>
                  )}
                  {selectedConfig.templateIpAddress && (
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">IP Address</label>
                      <p className="text-foreground">{selectedConfig.templateIpAddress}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Last Generated</label>
                  <p className="text-foreground">{selectedConfig.lastGeneratedAt ? formatDateTime(selectedConfig.lastGeneratedAt) : 'Never'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Next Generation</label>
                  <p className="text-foreground">{selectedConfig.nextGenerationAt ? formatDateTime(selectedConfig.nextGenerationAt) : 'Not scheduled'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Task Title Template</label>
                <p className="text-foreground font-medium">{selectedConfig.templateTitle}</p>
              </div>

              {selectedConfig.templateDescription && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Task Description Template</label>
                  <p className="text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg border border-border">{selectedConfig.templateDescription}</p>
                </div>
              )}
            </div>

            {/* Generated Tasks History */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Generated Task Instances</h4>
              {selectedConfig.tasks.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedConfig.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={task.status} />
                        <span className="text-sm text-muted-foreground">{formatDateTime(task.createdAt)}</span>
                      </div>
                      <ExternalLink size={14} className="text-muted-foreground/70" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No task instances generated yet</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedConfig(null);
        }}
        title="Delete Recurring Task"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={20} aria-hidden="true" />
            <div>
              <p className="text-sm text-destructive">
                Are you sure you want to delete the recurring task <strong>"{selectedConfig?.name}"</strong>?
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                This action cannot be undone. Previously generated tasks will not be deleted.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedConfig(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              variant="danger"
              isLoading={isDeleting}
              className="text-destructive"
            >
              <span className="text-destructive">Delete</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant="status" value={status} />;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant="priority" value={priority} />;
}
