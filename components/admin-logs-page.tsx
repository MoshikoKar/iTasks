'use client';

import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { Pagination } from './pagination';
import { formatDateTimeStable } from '@/lib/utils/date';

interface RecentActivity {
  id: string;
  type: 'audit' | 'system';
  action: string;
  description?: string;
  actionType?: string;
  entityType?: string;
  createdAt: Date;
  actor: { name: string } | null;
  task: { title: string } | null;
  taskTitle?: string | null;
}

interface AdminLogsPageProps {
  recentActivity: RecentActivity[];
}

export function AdminLogsPage({ recentActivity }: AdminLogsPageProps) {
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState<string>('all');
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);

  const filteredActivity = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();

    let result = recentActivity;

    if (activityActionFilter !== 'all') {
      result = result.filter((log) => log.action === activityActionFilter);
    }

    if (query) {
      result = result.filter((log) => {
        const taskTitle = log.task?.title?.toLowerCase() ?? log.taskTitle?.toLowerCase() ?? '';
        const actorName = log.actor?.name?.toLowerCase() ?? '';
        const action = log.action.toLowerCase();
        const description = log.description?.toLowerCase() ?? '';
        return (
          taskTitle.includes(query) ||
          actorName.includes(query) ||
          action.includes(query) ||
          description.includes(query)
        );
      });
    }

    return result;
  }, [recentActivity, activitySearch, activityActionFilter]);

  const totalActivityPages = Math.max(1, Math.ceil(filteredActivity.length / activityPageSize));

  const paginatedActivity = useMemo(() => {
    const page = Math.min(activityPage, totalActivityPages);
    const start = (page - 1) * activityPageSize;
    const end = start + activityPageSize;
    return filteredActivity.slice(start, end);
  }, [filteredActivity, activityPage, activityPageSize, totalActivityPages]);

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    recentActivity.forEach((log) => {
      actions.add(log.action);
    });
    return Array.from(actions).sort();
  }, [recentActivity]);

  const handleActivityPageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalActivityPages) return;
    setActivityPage(nextPage);
  };

  const handleActivityPageSizeChange = (size: number) => {
    setActivityPageSize(size);
    setActivityPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>

      {/* Recent Activity Section */}
      <section className="card-base p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            Recent Activity
          </h2>
          <div className="flex items-center gap-3">
            <input
              value={activitySearch}
              onChange={(e) => {
                setActivitySearch(e.target.value);
                setActivityPage(1);
              }}
              placeholder="Search by task, user, action..."
              className="input-base h-9 w-56"
            />
            <select
              value={activityActionFilter}
              onChange={(e) => {
                setActivityActionFilter(e.target.value);
                setActivityPage(1);
              }}
              className="input-base h-9"
            >
              <option value="all">All actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <select
              value={activityPageSize}
              onChange={(e) => handleActivityPageSizeChange(Number(e.target.value))}
              className="input-base h-9"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center text-sm text-muted-foreground">
            No activity found for the current filters.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-muted">
                  <tr className="text-left text-foreground">
                    <th className="px-3 py-2 font-semibold w-[25%]">Task</th>
                    <th className="px-3 py-2 font-semibold w-[15%]">User</th>
                    <th className="px-3 py-2 font-semibold w-[15%]">Action</th>
                    <th className="px-3 py-2 font-semibold w-[30%]">Description</th>
                    <th className="px-3 py-2 font-semibold w-[15%]">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedActivity.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded-full bg-primary/10 p-1.5">
                            <Activity size={14} className="text-primary" />
                          </div>
                          <span className="line-clamp-1 text-foreground">
                            {log.task?.title || log.taskTitle || 'Task'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {log.actor?.name || 'User'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {log.description ? (
                          <span className="line-clamp-2">{log.description}</span>
                        ) : (
                          <span className="text-muted-foreground/70 italic">No description</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDateTimeStable(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Showing{' '}
                <span className="font-semibold">
                  {(activityPage - 1) * activityPageSize + 1}
                </span>{' '}
                -{' '}
                <span className="font-semibold">
                  {Math.min(activityPage * activityPageSize, filteredActivity.length)}
                </span>{' '}
                of{' '}
                <span className="font-semibold">{filteredActivity.length}</span>{' '}
                activities
              </div>
              <div className="flex items-center justify-end">
                <Pagination
                  currentPage={activityPage}
                  totalPages={totalActivityPages}
                  onPageChange={handleActivityPageChange}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
