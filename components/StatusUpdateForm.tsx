'use client';

import { useState, useRef } from 'react';
import { Button } from './button';
import { TaskStatus } from '@prisma/client';
import { Paperclip, X } from 'lucide-react';
import { changeStatusAction } from '@/app/tasks/[id]/actions/task-actions';
import { addCommentAction } from '@/app/actions/comments';

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

      setProgressNotes('');
      setSelectedFiles([]);
      setNewStatus(null);
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4">
        <div>
          <label htmlFor="newStatus" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
            New Status
          </label>
          <select
            id="newStatus"
            value={newStatus || ''}
            onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
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
          <label htmlFor="progressNotes" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
            Progress Notes (Optional)
          </label>
          <textarea
            id="progressNotes"
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all resize-none"
            placeholder="Describe what has been done, what's in progress, or any additional information..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700 dark:text-neutral-300">
              Attach Evidence
            </label>
            {selectedFiles.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-neutral-400">
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="neu-button inline-flex items-center justify-center gap-1.5 text-xs font-medium"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <Paperclip size={14} />
              {selectedFiles.length > 0 ? 'Add More' : 'Attach Files'}
            </button>
            {selectedFiles.length > 0 && (
              <div className="space-y-1 mt-1.5">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-neutral-700/50 rounded border border-slate-200 dark:border-neutral-700 text-xs"
                  >
                    <span className="text-slate-700 dark:text-neutral-300 truncate flex-1">
                      {file.name} <span className="text-slate-400 dark:text-neutral-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="neu-button ml-2 inline-flex items-center justify-center"
                      style={{ fontSize: '10px', padding: '2px 6px', minWidth: 'auto' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Submit Button */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200 dark:border-neutral-700 shrink-0">
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
