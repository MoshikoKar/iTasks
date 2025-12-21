'use client';

import { useState, useRef } from 'react';
import { Button } from './button';
import { TaskStatus } from '@prisma/client';
import { Paperclip, X } from 'lucide-react';
import { changeStatusAction } from '@/app/tasks/[id]/actions/task-actions';
import { addCommentAction } from '@/app/actions/comments';
import { ErrorAlert } from './ui/error-alert';
import { toast } from 'sonner';

interface StatusUpdateFormProps {
  taskId: string;
  currentStatus: TaskStatus;
  onSuccess?: () => void;
}

export function StatusUpdateForm({ taskId, currentStatus, onSuccess }: StatusUpdateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressNotes, setProgressNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string>('');
  const previousStatusRef = useRef<TaskStatus>(currentStatus);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newStatus) return;

    const oldStatus = previousStatusRef.current;
    setIsSubmitting(true);
    try {
      // Change status
      const formData = new FormData();
      formData.append('taskId', taskId);
      formData.append('status', newStatus);
      await changeStatusAction(formData);

      // Upload files if any
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const uploadFormData = new FormData();
          uploadFormData.append('taskId', taskId);
          uploadFormData.append('file', file);

          const response = await fetch('/api/attachments', {
            method: 'POST',
            body: uploadFormData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
        });

        await Promise.all(uploadPromises);
      }

      // Add progress notes as a comment if provided
      if (progressNotes.trim()) {
        await addCommentAction(
          taskId,
          `Status Update: ${newStatus}\n\n${progressNotes}`,
          []
        );
      }

      previousStatusRef.current = newStatus;

      // Show toast with undo option
      toast.success(`Status updated to ${newStatus}`, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const undoFormData = new FormData();
              undoFormData.append('taskId', taskId);
              undoFormData.append('status', oldStatus);
              await changeStatusAction(undoFormData);
              previousStatusRef.current = oldStatus;
              toast.info('Status change undone');
              window.location.reload();
            } catch (error) {
              toast.error('Failed to undo status change');
            }
          },
        },
      });

      setProgressNotes('');
      setSelectedFiles([]);
      setNewStatus(null);
      setError('');
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status. Please try again.');
      toast.error('Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4">
        {error && (
          <ErrorAlert message={error} onDismiss={() => setError('')} />
        )}
        <div>
          <label htmlFor="newStatus" className="block text-sm font-medium text-foreground mb-2">
            New Status
          </label>
          <select
            id="newStatus"
            value={newStatus || ''}
            onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
            className="input-base"
            required
          >
            <option value="">Select status...</option>
            {Object.values(TaskStatus)
              .filter((status) => status !== currentStatus)
              .map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="progressNotes" className="block text-sm font-medium text-foreground mb-2">
            Progress Notes (Optional)
          </label>
          <textarea
            id="progressNotes"
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            rows={4}
            className="input-base resize-none"
            placeholder="Describe what has been done, what's in progress, or any additional information..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">
              Attach Evidence
            </label>
            {selectedFiles.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="secondary"
              className="gap-1.5"
            >
              <Paperclip size={14} />
              {selectedFiles.length > 0 ? 'Add More' : 'Attach Files'}
            </Button>
            {selectedFiles.length > 0 && (
              <div className="space-y-1 mt-1.5">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-1.5 bg-muted/50 rounded border border-border text-xs"
                  >
                    <span className="text-foreground truncate flex-1">
                      {file.name} <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <Button
                      type="button"
                      onClick={() => removeFile(index)}
                      size="sm"
                      variant="ghost"
                      className="ml-2 text-destructive"
                    >
                      <X size={12} className="text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Submit Button */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border shrink-0">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={!newStatus || isSubmitting}
        >
          Update Status
        </Button>
      </div>
    </form>
  );
}
