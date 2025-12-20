'use client';

import { useEffect, useRef, useState } from 'react';

export function useChangeHighlight<T>(value: T, duration: number = 1000) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const previousValueRef = useRef<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if value has changed
    if (previousValueRef.current !== value && previousValueRef.current !== undefined) {
      setIsHighlighted(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to remove highlight
      timeoutRef.current = setTimeout(() => {
        setIsHighlighted(false);
        timeoutRef.current = null;
      }, duration);
    }

    // Update the previous value
    previousValueRef.current = value;

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, duration]);

  return isHighlighted;
}
