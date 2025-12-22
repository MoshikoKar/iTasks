'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationType } from '@prisma/client';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
  taskId: string;
  task: {
    title: string;
  };
  actor?: {
    name: string;
  } | null;
}

interface NotificationDropdownProps {
  userId: string;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationDropdown({ userId, onClose, onUnreadCountChange }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?limit=7');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up polling for real-time updates (every 5 seconds)
    const interval = setInterval(fetchNotifications, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
        });
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
        // Update unread count
        onUnreadCountChange(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    onClose();

    // Navigate based on notification type
    if (notification.type === NotificationType.TaskAssigned ||
        notification.type === NotificationType.TaskStatusChanged ||
        notification.type === NotificationType.TaskClosed ||
        notification.type === NotificationType.AddedAsSubscriber ||
        notification.type === NotificationType.CommentAdded) {
      router.push(`/tasks/${notification.taskId}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        onUnreadCountChange(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleViewAll = () => {
    onClose();
    router.push('/notifications');
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-96 max-h-96 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
          Notifications
        </h3>
        {unreadNotifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={32} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No notifications yet
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              You'll see updates about tasks assigned to you here
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    !notification.isRead ? 'bg-blue-500' : 'bg-transparent'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      !notification.isRead
                        ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {notification.task.title}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={handleViewAll}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}