'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    if (!toast.action && toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const icons = {
    success: <CheckCircle size={18} className="text-green-600 dark:text-green-400" aria-hidden="true" />,
    error: <AlertCircle size={18} className="text-red-600 dark:text-red-400" aria-hidden="true" />,
    info: <Info size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm',
        toast.type ? bgColors[toast.type] : 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700'
      )}
      role="status"
      aria-live="polite"
    >
      {toast.type && icons[toast.type]}

      <p className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {toast.message}
      </p>

      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
