'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastContainer } from '@/components/ui/toast';

interface ToastContextType {
  showToast: (message: string, options?: Omit<Toast, 'id' | 'message'>) => void;
  showSuccessToast: (message: string, action?: Toast['action']) => void;
  showErrorToast: (message: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: Omit<Toast, 'id' | 'message'>) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = {
      id,
      message,
      ...options,
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const showSuccessToast = useCallback((message: string, action?: Toast['action']) => {
    showToast(message, { type: 'success', action });
  }, [showToast]);

  const showErrorToast = useCallback((message: string) => {
    showToast(message, { type: 'error' });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccessToast, showErrorToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
