'use client';

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Download, X } from 'lucide-react';
import { Role } from '@prisma/client';
import { formatDateTime } from '@/lib/utils/date';

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
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Paperclip size={16} className="text-slate-600" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {attachments.length}
            </span>
          )}
        </h2>
        <AttachmentUploader taskId={taskId} onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {attachments.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
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
}: {
  attachment: Attachment;
  currentUser: { id: string; role: Role };
  onDeleteSuccess: () => void;
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
        alert('Failed to delete attachment');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment');
    }
  };

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-all group shrink-0">
      <Paperclip size={12} className="text-slate-400 shrink-0 group-hover:text-blue-600 transition-colors" />
      <div className="flex-1 min-w-0">
        <a
          href={attachment.filePath}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-slate-900 hover:text-blue-600 transition-colors truncate block whitespace-nowrap"
          title={fileName}
        >
          {fileName}
        </a>
        <div className="text-[10px] text-slate-400 mt-0.5 truncate whitespace-nowrap">
          {attachment.user?.name || 'Unknown'} • {formatDateTime(typeof attachment.createdAt === 'string' ? new Date(attachment.createdAt) : attachment.createdAt)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={attachment.filePath}
          download
          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Download"
        >
          <Download size={12} />
        </a>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function AttachmentUploader({ taskId, onUploadSuccess }: { taskId: string; onUploadSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
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
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload files');
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
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Paperclip size={14} />
        {isUploading ? 'Uploading...' : 'Add'}
      </button>
    </div>
  );
}
