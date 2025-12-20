'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface AuditPreviewProps {
  lastUpdated: Date;
  updatedBy?: string;
  change?: string;
  children: React.ReactNode;
}

export function AuditPreview({ lastUpdated, updatedBy, change, children }: AuditPreviewProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-md shadow-lg z-50 pointer-events-none whitespace-nowrap"
          role="tooltip"
        >
          <div className="space-y-1">
            {updatedBy && (
              <div>
                <span className="text-neutral-400">By:</span> {updatedBy}
              </div>
            )}
            {change && (
              <div>
                <span className="text-neutral-400">Change:</span> {change}
              </div>
            )}
            <div>
              <span className="text-neutral-400">When:</span> {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </div>
          </div>
          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700"></div>
        </div>
      )}
    </div>
  );
}
