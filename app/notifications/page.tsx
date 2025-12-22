'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Check, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/button';
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
    status: string;
    priority: string;
  };
  actor?: {
    name: string;
  } | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();

    // Set up polling for real-time updates (every 5 seconds)
    const interval = setInterval(fetchNotifications, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
        });
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to task
    router.push(`/tasks/${notification.taskId}`);
  };

  const handleMarkAsRead = async (notificationId: string, markAsRead: boolean) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/${markAsRead ? 'read' : 'unread'}`, {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: markAsRead } : n)
        );
      }
    } catch (error) {
      console.error('Failed to update notification read status:', error);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-selected-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: Array.from(selectedNotifications) }),
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => selectedNotifications.has(n.id) ? { ...n, isRead: true } : n)
        );
        setSelectedNotifications(new Set());
      }
    } catch (error) {
      console.error('Failed to mark selected notifications as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setSelectedNotifications(new Set());
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteNotification = async () => {
    if (!notificationToDelete) {
      setDeleteModalOpen(false);
      return;
    }

    try {
      const response = await fetch(`/api/notifications/${notificationToDelete}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationToDelete));
        setSelectedNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationToDelete);
          return newSet;
        });
      } else {
        console.error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    } finally {
      setDeleteModalOpen(false);
      setNotificationToDelete(null);
    }
  };

  const handleSelectNotification = (notificationId: string, selected: boolean) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(notificationId);
      } else {
        newSet.delete(notificationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    } else {
      setSelectedNotifications(new Set());
    }
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-neutral-500 dark:text-neutral-400">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Notifications
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Stay updated on tasks assigned to you
          </p>
        </div>

        {unreadNotifications.length > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2"
          >
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            No notifications yet
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            You'll see updates about tasks assigned to you here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bulk actions */}
          {selectedNotifications.size > 0 && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedNotifications.size} selected
              </span>
              <Button
                onClick={handleMarkSelectedAsRead}
                variant="secondary"
                size="sm"
              >
                Mark selected as read
              </Button>
            </div>
          )}

          {/* Unread notifications */}
          {unreadNotifications.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Unread ({unreadNotifications.length})
                </h2>
                <button
                  onClick={() => handleSelectAll(unreadNotifications.every(n => selectedNotifications.has(n.id)))}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {unreadNotifications.every(n => selectedNotifications.has(n.id)) ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {unreadNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.has(notification.id)}
                    onSelect={handleSelectNotification}
                    onClick={handleNotificationClick}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Read notifications */}
          {readNotifications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Read ({readNotifications.length})
              </h2>
              <div className="space-y-2">
                {readNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.has(notification.id)}
                    onSelect={handleSelectNotification}
                    onClick={handleNotificationClick}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Notification</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Are you sure you want to delete this notification? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setNotificationToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteNotification}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onClick: (notification: Notification) => void;
  onMarkAsRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, isSelected, onSelect, onClick, onMarkAsRead, onDelete }: NotificationItemProps) {
  return (
    <div className={`flex items-start gap-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
      !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-neutral-800'
    }`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(notification.id, e.target.checked)}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
      />

      <div className="flex-1 min-w-0" onClick={() => onClick(notification)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={`text-sm cursor-pointer ${
              !notification.isRead
                ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}>
              {notification.title}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {notification.task.title} • {notification.task.status} • {notification.task.priority}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id, !notification.isRead);
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {notification.isRead ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              title="Delete notification"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}