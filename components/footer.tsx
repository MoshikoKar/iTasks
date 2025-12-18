'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import Link from 'next/link';

interface FooterProps {
  supportEmail?: string | null;
}

export function Footer({ supportEmail }: FooterProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <footer className="border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600 dark:text-neutral-400">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="text-slate-900 dark:text-neutral-100 font-medium">
              © {new Date().getFullYear()} iTasks. All rights reserved.
            </div>
            <div className="text-slate-500 dark:text-neutral-500">
              Version 0.1.0
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {mounted && currentTime && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-neutral-500">Server:</span>
                <span className="text-slate-700 dark:text-neutral-300 font-mono text-xs">
                  {formatDate(currentTime)} {formatTime(currentTime)}
                </span>
              </div>
            )}
            
            {supportEmail && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-500 dark:text-neutral-500" />
                <Link
                  href="/contact"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {supportEmail}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
