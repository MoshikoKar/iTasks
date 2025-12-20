'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UndoAction {
  type: 'status-change' | 'comment-delete' | 'task-reassign';
  undo: () => Promise<void>;
  message: string;
}

export function useUndo() {
  const [isUndoing, setIsUndoing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const executeWithUndo = useCallback(
    async (
      action: () => Promise<void>,
      undoAction: () => Promise<void>,
      message: string
    ) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Execute the action
      await action();

      // Show toast with undo button
      toast.success(message, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setIsUndoing(true);
            try {
              await undoAction();
              toast.info('Action undone');
            } catch (error) {
              toast.error('Failed to undo action');
            } finally {
              setIsUndoing(false);
            }
          },
        },
      });

      // Set timeout to clear undo capability after 5 seconds
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
      }, 5000);
    },
    []
  );

  return { executeWithUndo, isUndoing };
}
