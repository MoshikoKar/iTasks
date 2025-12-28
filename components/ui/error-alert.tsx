'use client';

import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorAlert({ message, onDismiss, className }: ErrorAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        'rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive',
        'flex items-start gap-3',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={20} className="shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium whitespace-pre-line text-destructive">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 md:p-1 max-md:p-2 rounded hover:bg-destructive/20 transition-colors min-h-[24px] min-w-[24px] md:min-h-[24px] md:min-w-[24px] max-md:min-h-[44px] max-md:min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss error message"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
