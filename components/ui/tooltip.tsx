'use client';

import { ReactNode, useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: ReactNode;
  showIcon?: boolean;
}

export function Tooltip({ content, children, showIcon = true }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center cursor-help"
      >
        {children || (showIcon && <Info size={14} className="text-muted-foreground hover:text-foreground transition-colors" />)}
      </div>
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none"
          role="tooltip"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700"></div>
        </div>
      )}
    </div>
  );
}
