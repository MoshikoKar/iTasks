'use client';

import { useEffect, useState, useMemo } from 'react';
import { Mail } from 'lucide-react';
import Link from 'next/link';

interface FooterProps {
  supportEmail?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
}

// Map date format settings to Intl.DateTimeFormat options
function getDateFormatOptions(dateFormat: string | null): Intl.DateTimeFormatOptions {
  switch (dateFormat) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      return { day: '2-digit', month: '2-digit', year: 'numeric' };
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      return { month: '2-digit', day: '2-digit', year: 'numeric' };
    case 'YYYY-MM-DD':
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
    default:
      return { day: '2-digit', month: '2-digit', year: 'numeric' };
  }
}

// Format date according to system settings
function formatDateWithSettings(date: Date, dateFormat: string | null, timezone: string | null): string {
  const tz = timezone || 'UTC';
  const options = getDateFormatOptions(dateFormat);
  
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      ...options,
      timeZone: tz,
    });
    
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    
    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'MM-DD-YYYY':
        return `${month}-${day}-${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  } catch {
    // Fallback if timezone is invalid
    return date.toLocaleDateString('en-GB');
  }
}

// Format time according to system settings
function formatTimeWithSettings(date: Date, timeFormat: string | null, timezone: string | null): string {
  const tz = timezone || 'UTC';
  const is12Hour = timeFormat === '12h';
  
  try {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: is12Hour,
      timeZone: tz,
    });
  } catch {
    // Fallback if timezone is invalid
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: is12Hour,
    });
  }
}

export function Footer({ supportEmail, timezone, dateFormat, timeFormat }: FooterProps) {
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

  const formattedDate = useMemo(() => {
    if (!currentTime) return '';
    return formatDateWithSettings(currentTime, dateFormat, timezone);
  }, [currentTime, dateFormat, timezone]);

  const formattedTime = useMemo(() => {
    if (!currentTime) return '';
    return formatTimeWithSettings(currentTime, timeFormat, timezone);
  }, [currentTime, timeFormat, timezone]);

  return (
    <footer className="border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 mt-auto">
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 dark:text-neutral-400">
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-4 md:gap-6">
            <div className="text-slate-900 dark:text-neutral-100 font-medium text-center sm:text-left">
              © {new Date().getFullYear()} iTasks. All rights reserved.
            </div>
            <div className="text-slate-500 dark:text-neutral-500">
              Version 0.1.0
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2 sm:gap-4 md:gap-6">
            {mounted && currentTime && (
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-slate-500 dark:text-neutral-500">Server:</span>
                <span className="text-slate-700 dark:text-neutral-300 font-mono text-[10px] sm:text-xs">
                  {formattedDate} {formattedTime}
                </span>
              </div>
            )}
            
            {supportEmail && (
              <div className="flex items-center gap-1 sm:gap-2">
                <Mail size={12} className="text-slate-500 dark:text-neutral-500 flex-shrink-0" />
                <Link
                  href="/contact"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors truncate max-w-[150px] sm:max-w-none"
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
