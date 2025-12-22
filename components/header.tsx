'use client';

import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NotificationDropdown } from './notification-dropdown';

interface HeaderProps {
  userId: string;
}

export function Header({ userId }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch unread notification count:', error);
      }
    };

    fetchUnreadCount();

    // Set up polling for real-time updates (every 5 seconds)
    const interval = setInterval(fetchUnreadCount, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex-1" />

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isDropdownOpen && (
            <NotificationDropdown
              userId={userId}
              onClose={() => setIsDropdownOpen(false)}
              onUnreadCountChange={setUnreadCount}
            />
          )}
        </div>
      </div>
    </header>
  );
}