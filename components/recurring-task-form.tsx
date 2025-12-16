'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { TaskPriority, User, Role } from '@prisma/client';
import { Calendar, User as UserIcon, AlertCircle } from 'lucide-react';

interface RecurringTaskFormProps {
  users: Pick<User, 'id' | 'name'>[];
  currentUser: { id: string; role: string };
  config?: {
    id: string;
    name: string;
    cron: string;
    templateTitle: string;
    templateDescription: string | null;
    templatePriority: TaskPriority;
    templateAssigneeId: string;
    templateBranch?: string | null;
    templateServerName?: string | null;
    templateApplication?: string | null;
    templateIpAddress?: string | null;
  };
  onSuccess?: () => void;
}

const cronPresets = [
  { label: 'Every Day at 9:00 AM', value: '0 9 * * *' },
  { label: 'Every Weekday at 9:00 AM', value: '0 9 * * 1-5' },
  { label: 'Every Monday at 9:00 AM', value: '0 9 * * 1' },
  { label: 'First Day of Month at 9:00 AM', value: '0 9 1 * *' },
  { label: 'Every Week on Sunday at 9:00 AM', value: '0 9 * * 0' },
  { label: 'Custom', value: 'custom' },
];

export function RecurringTaskForm({ users, currentUser, config, onSuccess }: RecurringTaskFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [cronPreset, setCronPreset] = useState(
    config ? (cronPresets.find(p => p.value === config.cron) ? config.cron : 'custom') : '0 9 * * *'
  );
  const [customCron, setCustomCron] = useState(
    config && !cronPresets.find(p => p.value === config.cron) ? config.cron : ''
  );

  useEffect(() => {
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
    const cronValue = cronPreset === 'custom' ? customCron : cronPreset;

    if (!cronValue) {
      setError('Please provide a cron schedule');
      setIsLoading(false);
      return;
    }

    const data = {
      name: formData.get('name') as string,
      cron: cronValue,
      templateTitle: formData.get('templateTitle') as string,
      templateDescription: formData.get('templateDescription') as string,
      templatePriority: formData.get('templatePriority') as TaskPriority,
      templateAssigneeId: formData.get('templateAssigneeId') as string,
      templateBranch: formData.get('templateBranch') as string || undefined,
      templateServerName: formData.get('templateServerName') as string || undefined,
      templateApplication: formData.get('templateApplication') as string || undefined,
      templateIpAddress: formData.get('templateIpAddress') as string || undefined,
    };

    try {
      const url = config ? `/api/recurring/${config.id}` : '/api/recurring';
      const method = config ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recurring task');
      }

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
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {/* Configuration Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
          Configuration Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={config?.name}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          placeholder="e.g., Weekly Server Backup Check"
        />
        <p className="mt-1.5 text-xs text-slate-500">A descriptive name for this recurring task configuration</p>
      </div>

      {/* Schedule */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          <Calendar className="inline mr-2" size={16} />
          Schedule <span className="text-red-500">*</span>
        </label>

        <select
          value={cronPreset}
          onChange={(e) => setCronPreset(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          {cronPresets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>

        {cronPreset === 'custom' && (
          <div>
            <input
              type="text"
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
              placeholder="0 9 * * *"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Enter cron expression (minute hour day month weekday)
            </p>
          </div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-800">
            <strong>Current schedule:</strong> {cronPreset === 'custom' ? customCron || 'Not set' : cronPreset}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Task Template</h3>

        {/* Template Title */}
        <div className="mb-4">
          <label htmlFor="templateTitle" className="block text-sm font-medium text-slate-700 mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="templateTitle"
            name="templateTitle"
            required
            defaultValue={config?.templateTitle}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="e.g., Weekly Server Backup Verification"
          />
        </div>

        {/* Template Description */}
        <div className="mb-4">
          <label htmlFor="templateDescription" className="block text-sm font-medium text-slate-700 mb-2">
            Task Description
          </label>
          <textarea
            id="templateDescription"
            name="templateDescription"
            rows={4}
            defaultValue={config?.templateDescription || ''}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
            placeholder="Describe what needs to be done for each occurrence..."
          />
        </div>

        {/* Priority, Branch, and Assignee Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="templatePriority" className="block text-sm font-medium text-slate-700 mb-2">
              Priority
            </label>
            <select
              id="templatePriority"
              name="templatePriority"
              defaultValue={config?.templatePriority || 'Medium'}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="templateBranch" className="block text-sm font-medium text-slate-700 mb-2">
              Branch / Location
            </label>
            <input
              type="text"
              id="templateBranch"
              name="templateBranch"
              list="branch-suggestions"
              autoComplete="off"
              defaultValue={config?.templateBranch || ''}
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
            <label htmlFor="templateAssigneeId" className="block text-sm font-medium text-slate-700 mb-2">
              <UserIcon className="inline mr-1" size={16} />
              Default Assignee <span className="text-red-500">*</span>
            </label>
            <select
              id="templateAssigneeId"
              name="templateAssigneeId"
              required
              defaultValue={config?.templateAssigneeId || currentUser.id}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            {(currentUser.role === Role.Technician || currentUser.role === Role.Viewer) && (
              <p className="mt-1.5 text-xs text-slate-500">
                You can only assign recurring tasks to yourself
              </p>
            )}
          </div>
        </div>

        {/* IT Context Section */}
        <div className="pt-4 border-t border-slate-200 mt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">IT Asset Context (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="templateServerName" className="block text-sm font-medium text-slate-700 mb-1">
                Server Name
              </label>
              <input
                type="text"
                id="templateServerName"
                name="templateServerName"
                defaultValue={config?.templateServerName || ''}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., SRV-WEB-01"
              />
            </div>

            <div>
              <label htmlFor="templateApplication" className="block text-sm font-medium text-slate-700 mb-1">
                Application
              </label>
              <input
                type="text"
                id="templateApplication"
                name="templateApplication"
                defaultValue={config?.templateApplication || ''}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., Exchange Server"
              />
            </div>

            <div>
              <label htmlFor="templateIpAddress" className="block text-sm font-medium text-slate-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                id="templateIpAddress"
                name="templateIpAddress"
                defaultValue={config?.templateIpAddress || ''}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="e.g., 192.168.1.100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {config ? 'Update Configuration' : 'Create Configuration'}
        </Button>
      </div>
    </form>
  );
}
