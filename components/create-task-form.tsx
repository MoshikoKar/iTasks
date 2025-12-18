'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { TaskPriority, User } from '@prisma/client';
import { Paperclip, X } from 'lucide-react';
import { ErrorAlert } from './ui/error-alert';

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        manufacturer: formData.get('manufacturer') as string || undefined,
        version: formData.get('version') as string || undefined,
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

      const task = await response.json();

      // Upload files if any
      if (selectedFiles.length > 0 && task.id) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('taskId', task.id);
          formData.append('file', file);
          
          const uploadResponse = await fetch('/api/attachments', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
        });

        await Promise.all(uploadPromises);
      }

      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <ErrorAlert message={error} onDismiss={() => setError('')} />
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
            Task Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="input-base"
            placeholder="Enter task title"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            className="input-base resize-none"
            placeholder="Describe the task in detail"
          />
        </div>

        {/* Priority, Branch, and Assignee Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label htmlFor="priority" className="block text-xs font-medium text-foreground mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="Medium"
              className="input-base"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="branch" className="block text-xs font-medium text-foreground mb-1">
              Branch / Location
            </label>
            <input
              type="text"
              id="branch"
              name="branch"
              list="branch-suggestions"
              autoComplete="off"
              className="input-base"
              placeholder="e.g., Main Office, Branch A"
            />
            <datalist id="branch-suggestions">
              {branches.map((branch) => (
                <option key={branch} value={branch} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="assigneeId" className="block text-xs font-medium text-foreground mb-1">
              Assign To
            </label>
            <select
              id="assigneeId"
              name="assigneeId"
              defaultValue={currentUserId}
              className="input-base"
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
            <label htmlFor="dueDate" className="block text-xs font-medium text-foreground mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              className="input-base"
            />
          </div>

          <div>
            <label htmlFor="slaDeadline" className="block text-xs font-medium text-foreground mb-1">
              SLA Deadline
            </label>
            <input
              type="datetime-local"
              id="slaDeadline"
              name="slaDeadline"
              className="input-base"
            />
          </div>
        </div>

        {/* File Attachments */}
        <div className="pt-4 border-t border-border">
          <label htmlFor="files" className="block text-sm font-medium text-foreground mb-2">
            Attachments (Optional)
          </label>
          <div className="space-y-2">
            <input
              type="file"
              id="files"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              className="gap-2"
            >
              <Paperclip size={16} />
              Add Files
            </Button>
            {selectedFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border"
                  >
                    <span className="text-sm text-foreground truncate flex-1">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <Button
                      type="button"
                      onClick={() => removeFile(index)}
                      size="sm"
                      variant="ghost"
                      className="ml-2"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* IT Context Section */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">IT Asset Context (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label htmlFor="serverName" className="block text-xs font-medium text-foreground mb-1">
                Server Name
              </label>
              <input
                type="text"
                id="serverName"
                name="serverName"
                className="input-base"
                placeholder="e.g., SRV-WEB-01"
              />
            </div>

            <div>
              <label htmlFor="application" className="block text-xs font-medium text-foreground mb-1">
                Application
              </label>
              <input
                type="text"
                id="application"
                name="application"
                className="input-base"
                placeholder="e.g., Exchange Server"
              />
            </div>

            <div>
              <label htmlFor="ipAddress" className="block text-xs font-medium text-foreground mb-1">
                IP Address
              </label>
              <input
                type="text"
                id="ipAddress"
                name="ipAddress"
                className="input-base"
                placeholder="e.g., 192.168.1.100"
              />
            </div>

            <div>
              <label htmlFor="environment" className="block text-xs font-medium text-foreground mb-1">
                Environment
              </label>
              <select
                id="environment"
                name="environment"
                className="input-base"
              >
                <option value="">Select...</option>
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
                <option value="QA">QA</option>
              </select>
            </div>

            <div>
              <label htmlFor="workstationId" className="block text-xs font-medium text-foreground mb-1">
                Workstation ID
              </label>
              <input
                type="text"
                id="workstationId"
                name="workstationId"
                className="input-base"
                placeholder="e.g., WS-USER-123"
              />
            </div>

            <div>
              <label htmlFor="adUser" className="block text-xs font-medium text-foreground mb-1">
                AD User
              </label>
              <input
                type="text"
                id="adUser"
                name="adUser"
                className="input-base"
                placeholder="e.g., john.doe"
              />
            </div>

            <div>
              <label htmlFor="manufacturer" className="block text-xs font-medium text-foreground mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                id="manufacturer"
                name="manufacturer"
                className="input-base"
                placeholder="e.g., Dell, HP, Microsoft"
              />
            </div>

            <div>
              <label htmlFor="version" className="block text-xs font-medium text-foreground mb-1">
                Version
              </label>
              <input
                type="text"
                id="version"
                name="version"
                className="input-base"
                placeholder="e.g., 1.0.0, Windows 10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="submit" variant="primary" isLoading={isLoading}>
          Create Task
        </Button>
      </div>
    </form>
  );
}
