'use client';

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Download, X } from 'lucide-react';
import { Role } from '@prisma/client';
import { formatDateTime } from '@/lib/utils/date';
import { ErrorAlert } from './ui/error-alert';
import { Button } from './button';

interface Attachment {
  id: string;
  filePath: string;
  fileType: string;
  createdAt: Date | string;
  user: { id: string; name: string } | null;
}

interface TaskAttachmentsProps {
  taskId: string;
  attachments: Attachment[];
  currentUser: { id: string; role: Role };
}

export function TaskAttachments({ taskId, attachments: initialAttachments, currentUser }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [error, setError] = useState<string>('');

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/attachments?taskId=${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const handleUploadSuccess = () => {
    fetchAttachments();
  };

  const handleDeleteSuccess = () => {
    fetchAttachments();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header - Fixed Height */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Paperclip size={16} className="text-muted-foreground" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {attachments.length}
            </span>
          )}
        </h2>
        <AttachmentUploader taskId={taskId} onUploadSuccess={handleUploadSuccess} />
      </div>

      {error && (
        <div className="mb-2">
          <ErrorAlert message={error} onDismiss={() => setError('')} />
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {attachments.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No attachments
          </div>
        ) : (
          <div className="space-y-1 pr-1">
            {attachments.map((attachment) => (
              <AttachmentItem 
                key={attachment.id} 
                attachment={attachment} 
                currentUser={currentUser}
                onDeleteSuccess={handleDeleteSuccess}
                onError={(err) => setError(err)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttachmentItem({
  attachment,
  currentUser,
  onDeleteSuccess,
  onError,
}: {
  attachment: Attachment;
  currentUser: { id: string; role: Role };
  onDeleteSuccess: () => void;
  onError: (error: string) => void;
}) {
  const fileName = attachment.filePath.split('/').pop() || 'file';
  const canDelete = currentUser.role === Role.Admin || attachment.user?.id === currentUser.id;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        onDeleteSuccess();
      } else {
        onError('Failed to delete attachment');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      onError('Failed to delete attachment');
    }
  };

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-md border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group shrink-0">
      <Paperclip size={12} className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      <div className="flex-1 min-w-0">
        <a
          href={attachment.filePath}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate block whitespace-nowrap"
          title={fileName}
        >
          {fileName}
        </a>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate whitespace-nowrap">
          {attachment.user?.name || 'Unknown'} • {formatDateTime(typeof attachment.createdAt === 'string' ? new Date(attachment.createdAt) : attachment.createdAt)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={attachment.filePath}
          download
          className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
          title="Download"
          aria-label="Download attachment"
        >
          <Download size={12} aria-hidden="true" />
        </a>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
            title="Delete"
            aria-label="Delete attachment"
          >
            <X size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function AttachmentUploader({ taskId, onUploadSuccess }: { taskId: string; onUploadSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      // Upload all files in parallel
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('taskId', taskId);
        formData.append('file', file);

        const response = await fetch('/api/attachments', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      onUploadSuccess();
      setError('');
    } catch (error) {
      console.error('Error uploading files:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
        multiple
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        size="sm"
        className="gap-1.5"
        isLoading={isUploading}
      >
        <Paperclip size={14} />
        {isUploading ? 'Uploading...' : 'Add'}
      </Button>
      {error && (
        <div className="mt-2">
          <ErrorAlert message={error} onDismiss={() => setError('')} />
        </div>
      )}
    </div>
  );
}
