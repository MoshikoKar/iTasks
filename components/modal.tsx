'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Standard padding for modal header, body, and footer. */
const MODAL_PADDING = 'px-4 sm:px-6 py-3 sm:py-4';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional footer content (e.g. actions). When provided, only the body scrolls. */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus trap
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

      firstElement?.focus();

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => {
        document.removeEventListener('keydown', handleTab);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop: consistent blur and click-to-close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`relative flex w-full flex-col ${sizeClasses[size]} max-h-[90vh] rounded-xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md border border-white/20 dark:border-neutral-700/50 shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: fixed, standard padding */}
              <div className={`flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-neutral-700 ${MODAL_PADDING} bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-t-xl`}>
                <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-neutral-100 pr-2">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="rounded-lg p-1 text-slate-400 dark:text-neutral-500 transition-colors hover:bg-slate-100 dark:hover:bg-neutral-700 hover:text-slate-600 dark:hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Body: scrollable when content overflows */}
              <div className={`flex-1 min-h-0 overflow-y-auto ${MODAL_PADDING}`}>
                {children}
              </div>

              {/* Footer: fixed when provided, standard padding */}
              {footer != null && (
                <div className={`flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 dark:border-neutral-700 ${MODAL_PADDING} bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-b-xl`}>
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
