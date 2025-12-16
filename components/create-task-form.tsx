'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { TaskPriority, User } from '@prisma/client';

interface CreateTaskFormProps {
  currentUserId: string;
  users: Pick<User, 'id' | 'name'>[];
  onSuccess?: () => void;
}

export function CreateTaskForm({ currentUserId, users, onSuccess }: CreateTaskFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    // Fetch existing branches for autocomplete
    fetch('/api/branches')
      .then(res => res.ok ? res.json() : [])
      .then(data => setBranches(data))
      .catch(() => setBranches([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as TaskPriority,
      branch: formData.get('branch') as string || undefined,
      assigneeId: formData.get('assigneeId') as string,
      dueDate: formData.get('dueDate') as string,
      slaDeadline: formData.get('slaDeadline') as string,
      creatorId: currentUserId,
      context: {
        serverName: formData.get('serverName') as string || undefined,
        application: formData.get('application') as string || undefined,
        ipAddress: formData.get('ipAddress') as string || undefined,
        environment: formData.get('environment') as string || undefined,
        workstationId: formData.get('workstationId') as string || undefined,
        adUser: formData.get('adUser') as string || undefined,
      },
    };

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Enter task title"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            placeholder="Describe the task in detail"
          />
        </div>

        {/* Priority, Branch, and Assignee Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="Medium"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-slate-700 mb-1">
              Branch / Location
            </label>
            <input
              type="text"
              id="branch"
              name="branch"
              list="branch-suggestions"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="e.g., Main Office, Branch A"
            />
            <datalist id="branch-suggestions">
              {branches.map((branch) => (
                <option key={branch} value={branch} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="assigneeId" className="block text-sm font-medium text-slate-700 mb-1">
              Assign To
            </label>
            <select
              id="assigneeId"
              name="assigneeId"
              defaultValue={currentUserId}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date and SLA Deadline Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="slaDeadline" className="block text-sm font-medium text-slate-700 mb-1">
              SLA Deadline
            </label>
            <input
              type="datetime-local"
              id="slaDeadline"
              name="slaDeadline"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* IT Context Section */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">IT Asset Context (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="serverName" className="block text-sm font-medium text-slate-700 mb-1">
                Server Name
              </label>
              <input
                type="text"
                id="serverName"
                name="serverName"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., SRV-WEB-01"
              />
            </div>

            <div>
              <label htmlFor="application" className="block text-sm font-medium text-slate-700 mb-1">
                Application
              </label>
              <input
                type="text"
                id="application"
                name="application"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., Exchange Server"
              />
            </div>

            <div>
              <label htmlFor="ipAddress" className="block text-sm font-medium text-slate-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                id="ipAddress"
                name="ipAddress"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., 192.168.1.100"
              />
            </div>

            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-slate-700 mb-1">
                Environment
              </label>
              <select
                id="environment"
                name="environment"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">Select...</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
                <option value="QA">QA</option>
              </select>
            </div>

            <div>
              <label htmlFor="workstationId" className="block text-sm font-medium text-slate-700 mb-1">
                Workstation ID
              </label>
              <input
                type="text"
                id="workstationId"
                name="workstationId"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., WS-USER-123"
              />
            </div>

            <div>
              <label htmlFor="adUser" className="block text-sm font-medium text-slate-700 mb-1">
                AD User
              </label>
              <input
                type="text"
                id="adUser"
                name="adUser"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., john.doe"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="submit" variant="primary" isLoading={isLoading}>
          Create Task
        </Button>
      </div>
    </form>
  );
}
