'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './button';
import { TaskPriority, User } from '@prisma/client';
import { Paperclip, X } from 'lucide-react';
import { ErrorAlert } from './ui/error-alert';
import { useCSRF } from '@/hooks/useCSRF';

interface CreateTaskFormProps {
  currentUserId: string;
  users: Pick<User, 'id' | 'name'>[];
  onSuccess?: () => void;
}

export function CreateTaskForm({ currentUserId, users, onSuccess }: CreateTaskFormProps) {
  const router = useRouter();
  const { csrfToken, loading: csrfLoading, getHeaders } = useCSRF();
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

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
  ];

  const validateFiles = (files: File[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 10MB`);
      }
      
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type "${file.type}" is not allowed. Allowed types: PDF, images, text files, and Office documents.`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const validateFormData = (formData: FormData): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Title validation
    const title = (formData.get('title') as string)?.trim() || '';
    if (!title) {
      errors.push('Title is required');
    } else if (title.length > 255) {
      errors.push('Title must be less than 255 characters');
    }
    
    // Description validation
    const description = (formData.get('description') as string)?.trim() || '';
    if (!description) {
      errors.push('Description is required');
    }
    
    // Priority validation
    const priority = formData.get('priority') as string;
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (priority && !validPriorities.includes(priority)) {
      errors.push('Invalid priority selected');
    }
    
    // AssigneeId validation (must be valid UUID if provided)
    const assigneeId = formData.get('assigneeId') as string;
    if (assigneeId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assigneeId)) {
        errors.push('Invalid assignee selected');
      }
    }
    
    // DueDate validation (must be valid date if provided)
    const dueDate = formData.get('dueDate') as string;
    if (dueDate) {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        errors.push('Invalid due date');
      }
    }
    
    // SLA Deadline validation (must be valid date if provided)
    const slaDeadline = formData.get('slaDeadline') as string;
    if (slaDeadline) {
      const date = new Date(slaDeadline);
      if (isNaN(date.getTime())) {
        errors.push('Invalid SLA deadline');
      }
    }
    
    // Date logic validation: SLA deadline should be after due date if both are provided
    if (dueDate && slaDeadline) {
      const due = new Date(dueDate);
      const sla = new Date(slaDeadline);
      if (sla < due) {
        errors.push('SLA deadline cannot be before due date');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    // Validate all form fields BEFORE creating the task
    const formValidation = validateFormData(formData);
    if (!formValidation.valid) {
      setError(`Please fix the following errors:\n${formValidation.errors.join('\n')}`);
      setIsLoading(false);
      return;
    }

    // Validate all files BEFORE creating the task
    if (selectedFiles.length > 0) {
      const fileValidation = validateFiles(selectedFiles);
      if (!fileValidation.valid) {
        setError(`Cannot create task with invalid files:\n${fileValidation.errors.join('\n')}`);
        setIsLoading(false);
        return;
      }
    }
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
      if (csrfLoading || !csrfToken) {
        setError('Please wait while security token loads...');
        setIsLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        ...getHeaders(),
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const task = await response.json();

      // Upload files if any (all files are already validated at this point)
      if (selectedFiles.length > 0 && task.id) {
        // Re-validate files one more time before upload as a safety check
        const finalValidation = validateFiles(selectedFiles);
        if (!finalValidation.valid) {
          // This should never happen, but if it does, we need to handle it
          throw new Error(`Invalid files detected before upload:\n${finalValidation.errors.join('\n')}`);
        }

        const uploadResults = await Promise.allSettled(
          selectedFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('taskId', task.id);
            formData.append('file', file);
            
            const uploadHeaders = getHeaders();
            
            const uploadResponse = await fetch('/api/attachments', {
              method: 'POST',
              headers: uploadHeaders,
              credentials: 'same-origin',
              body: formData,
            });

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(`${file.name}: ${errorData.error || 'Upload failed'}`);
            }
          })
        );

        // Check for failed uploads
        const failedUploads = uploadResults
          .map((result, index) => {
            if (result.status === 'rejected') {
              const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
              return { file: selectedFiles[index], error };
            }
            return null;
          })
          .filter((item): item is { file: File; error: Error } => item !== null);

        if (failedUploads.length > 0) {
          const errorMessages = failedUploads.map(({ file, error }) => 
            error.message || `Failed to upload ${file.name}`
          );
          throw new Error(`Task created but some files failed to upload:\n${errorMessages.join('\n')}`);
        }
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
    
    // Client-side file validation using the same validation function
    const validation = validateFiles(files);
    
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
    }
    
    // Only add valid files
    const validFiles = files.filter((file) => {
      return file.size <= MAX_FILE_SIZE && ALLOWED_FILE_TYPES.includes(file.type);
    });
    
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    
    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
                      className="ml-2 text-destructive"
                    >
                      <X size={14} className="text-destructive" />
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
