'use client';

import { useState } from 'react';
import { TaskStatus, TaskPriority, User } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Repeat, Plus, Calendar, Clock, AlertTriangle, Edit, ExternalLink, User as UserIcon, Trash2, Eye, Play } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

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
}

export function RecurringPageWrapper({ configs, users }: RecurringPageWrapperProps) {
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
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Repeat size={28} className="text-blue-600" />
            Recurring Tasks
          </h1>
          <p className="mt-1 text-slate-600">Manage automated task generation schedules</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <Plus size={18} />
          Create Recurring Task
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Repeat size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No recurring tasks configured</h3>
          <p className="text-slate-500 mb-6">Get started by creating your first recurring task configuration</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Create Your First Recurring Task
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Run</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Next Run</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Assignee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {configs.map((config) => {
                const lastTask = config.tasks[0];
                const isLastTaskIncomplete = lastTask && lastTask.status !== TaskStatus.Resolved && lastTask.status !== TaskStatus.Closed;
                const nextRun = config.nextGenerationAt ? new Date(config.nextGenerationAt) : null;
                const isOverdue = nextRun && nextRun < new Date();

                return (
                  <tr key={config.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-blue-100 p-2">
                          <Repeat size={16} className="text-blue-600" />
                        </div>
                        <span className="font-semibold text-slate-900">{config.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{config.cron}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        {config.lastGeneratedAt ? formatDateTime(config.lastGeneratedAt) : <span className="text-slate-400">Never</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isOverdue ? (
                        <div className="flex items-center gap-2 text-red-600 font-semibold">
                          <AlertTriangle size={16} />
                          {nextRun ? formatDateTime(nextRun) : <span className="text-slate-400">Not scheduled</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock size={14} className="text-slate-400" />
                          {nextRun ? formatDateTime(nextRun) : <span className="text-slate-400">Not scheduled</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {lastTask ? (
                        <div className="flex items-center gap-2">
                          <StatusBadge status={lastTask.status} />
                          {isLastTaskIncomplete && (
                            <div className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                              <AlertTriangle size={12} />
                              Incomplete
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">No instances</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <UserIcon size={14} className="text-slate-400" />
                        <span className="font-medium">{config.templateAssignee.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunNow(config)}
                          disabled={runningConfigId === config.id}
                          className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline text-xs font-medium transition-colors disabled:opacity-50"
                          title="Run this recurring task now (creates a task immediately)"
                        >
                          <Play size={14} />
                          {runningConfigId === config.id ? 'Running...' : 'Run Now'}
                        </button>
                        <button
                          onClick={() => handleView(config)}
                          className="flex items-center gap-1 text-slate-600 hover:text-slate-800 hover:underline text-xs font-medium transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(config)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium transition-colors"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(config)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:underline text-xs font-medium transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete
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
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Name</label>
                  <p className="text-slate-900 font-semibold">{selectedConfig.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assignee</label>
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-slate-400" />
                    <p className="text-slate-900">{selectedConfig.templateAssignee.name}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Schedule (Cron)</label>
                  <code className="text-sm bg-slate-100 px-3 py-1 rounded font-mono">{selectedConfig.cron}</code>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                  <PriorityBadge priority={selectedConfig.templatePriority} />
                </div>
              </div>

              {(selectedConfig.templateBranch || selectedConfig.templateServerName || selectedConfig.templateApplication || selectedConfig.templateIpAddress) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedConfig.templateBranch && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Branch</label>
                      <p className="text-slate-900">{selectedConfig.templateBranch}</p>
                    </div>
                  )}
                  {selectedConfig.templateServerName && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Server Name</label>
                      <p className="text-slate-900">{selectedConfig.templateServerName}</p>
                    </div>
                  )}
                  {selectedConfig.templateApplication && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Application</label>
                      <p className="text-slate-900">{selectedConfig.templateApplication}</p>
                    </div>
                  )}
                  {selectedConfig.templateIpAddress && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">IP Address</label>
                      <p className="text-slate-900">{selectedConfig.templateIpAddress}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Last Generated</label>
                  <p className="text-slate-900">{selectedConfig.lastGeneratedAt ? formatDateTime(selectedConfig.lastGeneratedAt) : 'Never'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Next Generation</label>
                  <p className="text-slate-900">{selectedConfig.nextGenerationAt ? formatDateTime(selectedConfig.nextGenerationAt) : 'Not scheduled'}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Task Title Template</label>
                <p className="text-slate-900 font-medium">{selectedConfig.templateTitle}</p>
              </div>

              {selectedConfig.templateDescription && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Task Description Template</label>
                  <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">{selectedConfig.templateDescription}</p>
                </div>
              )}
            </div>

            {/* Generated Tasks History */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Generated Task Instances</h4>
              {selectedConfig.tasks.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedConfig.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={task.status} />
                        <span className="text-sm text-slate-600">{formatDateTime(task.createdAt)}</span>
                      </div>
                      <ExternalLink size={14} className="text-slate-400" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No task instances generated yet</p>
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
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm text-red-800">
                Are you sure you want to delete the recurring task <strong>"{selectedConfig?.name}"</strong>?
              </p>
              <p className="text-xs text-red-600 mt-1">
                This action cannot be undone. Previously generated tasks will not be deleted.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedConfig(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    Open: "bg-blue-100 text-blue-800 border border-blue-200",
    InProgress: "bg-purple-100 text-purple-800 border border-purple-200",
    PendingVendor: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    PendingUser: "bg-orange-100 text-orange-800 border border-orange-200",
    Resolved: "bg-green-100 text-green-800 border border-green-200",
    Closed: "bg-slate-100 text-slate-800 border border-slate-200",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors: Record<TaskPriority, string> = {
    Low: "bg-green-100 text-green-800 border border-green-200",
    Medium: "bg-blue-100 text-blue-800 border border-blue-200",
    High: "bg-orange-100 text-orange-800 border border-orange-200",
    Critical: "bg-red-100 text-red-800 border border-red-200",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[priority]}`}>{priority}</span>;
}
