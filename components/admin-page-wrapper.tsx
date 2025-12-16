'use client';

import { useMemo, useState } from 'react';
import { Role } from '@prisma/client';
import { UserPlus, Edit2, Trash2, Settings, Mail, Activity, Building2, Plus, X, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from './button';
import { useRouter } from 'next/navigation';

const Modal = dynamic(() => import('./modal').then(mod => ({ default: mod.Modal })), {
  ssr: false,
});
const UserForm = dynamic(() => import('./user-form').then(mod => ({ default: mod.UserForm })), {
  ssr: false,
});

interface Team {
  id: string;
  name: string;
  description: string | null;
  _count: {
    members: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  team: { id: string; name: string } | null;
  createdAt: Date;
  _count: {
    tasksAssigned: number;
    tasksCreated: number;
  };
}

interface RecentActivity {
  id: string;
  action: string;
  createdAt: Date;
  actor: { name: string } | null;
  task: { title: string } | null;
}

interface AdminPageWrapperProps {
  users: User[];
  teams: Team[];
  stats: { role: Role; _count: number }[];
  recentActivity: RecentActivity[];
}

function formatDateTime(value: Date | string) {
  const date = new Date(value);
  // Stable, timezone-agnostic string to avoid SSR/CSR locale differences
  return date.toISOString().replace('T', ' ').slice(0, 16);
}

export function AdminPageWrapper({ users, teams, stats, recentActivity }: AdminPageWrapperProps) {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState<string>('all');
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);

  // Team management state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTeamDeleting, setIsTeamDeleting] = useState(false);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        setDeleteError(error.error || 'Failed to delete user');
        setIsDeleting(false);
        return;
      }

      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      setDeleteError('');
      router.refresh();
    } catch (error) {
      setDeleteError('An error occurred while deleting the user');
      setIsDeleting(false);
    }
  };

  // Team management handlers
  const handleSaveTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    };

    try {
      const url = selectedTeam ? `/api/teams/${selectedTeam.id}` : '/api/teams';
      const method = selectedTeam ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to save team');
        return;
      }

      setIsTeamModalOpen(false);
      setSelectedTeam(null);
      router.refresh();
    } catch (error) {
      alert('An error occurred while saving the team');
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete team "${team.name}"?`)) return;

    setIsTeamDeleting(true);
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete team');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred while deleting the team');
    } finally {
      setIsTeamDeleting(false);
    }
  };

  const filteredActivity = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();

    let result = recentActivity;

    if (activityActionFilter !== 'all') {
      result = result.filter((log) => log.action === activityActionFilter);
    }

    if (query) {
      result = result.filter((log) => {
        const taskTitle = log.task?.title?.toLowerCase() ?? '';
        const actorName = log.actor?.name?.toLowerCase() ?? '';
        const action = log.action.toLowerCase();
        return (
          taskTitle.includes(query) ||
          actorName.includes(query) ||
          action.includes(query)
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
    recentActivity.forEach((log) => actions.add(log.action));
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
      <h1 className="text-3xl font-bold text-slate-900">Admin Settings</h1>

      {/* User Statistics */}
      <section className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 flex items-center gap-2">
          <UserPlus size={20} className="text-blue-600" />
          User Statistics
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.role} className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-slate-600">{stat.role}</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">{stat._count}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Teams Management */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            Teams / Departments
          </h2>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedTeam(null);
              setIsTeamModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus size={18} />
            Create Team
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500">
              No teams created yet. Create your first team to organize users.
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => {
                        setSelectedTeam(team);
                        setIsTeamModalOpen(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team)}
                      disabled={isTeamDeleting}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                  <UserPlus size={12} />
                  {team._count.members} member{team._count.members !== 1 ? 's' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Users Table */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <UserPlus size={18} />
            Add User
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Team</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tasks Assigned</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tasks Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.team ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                        <Building2 size={12} />
                        {user.team.name}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user._count.tasksAssigned}</td>
                  <td className="px-4 py-3 text-slate-600">{user._count.tasksCreated}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-800 hover:underline text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
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
              className="h-9 w-56 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={activityActionFilter}
              onChange={(e) => {
                setActivityActionFilter(e.target.value);
                setActivityPage(1);
              }}
              className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No activity found for the current filters.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2 font-semibold w-[30%]">Task</th>
                    <th className="px-3 py-2 font-semibold w-[20%]">User</th>
                    <th className="px-3 py-2 font-semibold w-[20%]">Action</th>
                    <th className="px-3 py-2 font-semibold w-[30%]">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedActivity.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded-full bg-blue-50 p-1.5">
                            <Activity size={14} className="text-blue-600" />
                          </div>
                          <span className="line-clamp-1 text-slate-900">
                            {log.task?.title || 'Task'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {log.actor?.name || 'User'}
                      </td>
                      <td className="px-3 py-2 text-blue-700">
                        {log.action}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleActivityPageChange(activityPage - 1)}
                  disabled={activityPage <= 1}
                  className="h-7 px-2 text-xs"
                >
                  Prev
                </Button>
                <span className="text-slate-500">
                  Page{' '}
                  <span className="font-semibold text-slate-800">
                    {activityPage}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-800">
                    {totalActivityPages}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => handleActivityPageChange(activityPage + 1)}
                  disabled={activityPage >= totalActivityPages}
                  className="h-7 px-2 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* System Configuration */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Settings size={20} className="text-blue-600" />
          System Configuration
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Mail size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">SMTP Server</div>
                <div className="text-sm text-slate-600">Local LAN, Port 25</div>
              </div>
            </div>
            <Button variant="ghost" className="text-blue-600">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Settings size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">SLA Defaults</div>
                <div className="text-sm text-slate-600">Configure default SLA deadlines</div>
              </div>
            </div>
            <Button variant="ghost" className="text-blue-600">
              Configure
            </Button>
          </div>
        </div>
      </section>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        size="md"
      >
        <UserForm
          onSuccess={() => {
            setIsAddModalOpen(false);
            router.refresh();
          }}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        size="md"
      >
        {selectedUser && (
          <UserForm
            user={selectedUser}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setSelectedUser(null);
              router.refresh();
            }}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
          setDeleteError('');
        }}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <span className="text-sm text-red-800">{deleteError}</span>
            </div>
          )}
          <p className="text-slate-700">
            Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedUser(null);
                setDeleteError('');
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Team Modal */}
      <Modal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setSelectedTeam(null);
        }}
        title={selectedTeam ? 'Edit Team' : 'Create Team'}
        size="md"
      >
        <form onSubmit={handleSaveTeam} className="space-y-4">
          <div>
            <label htmlFor="team-name" className="block text-sm font-medium text-slate-700 mb-1">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="team-name"
              name="name"
              required
              defaultValue={selectedTeam?.name}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="e.g., IT Support, Field Technicians"
            />
          </div>

          <div>
            <label htmlFor="team-description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="team-description"
              name="description"
              rows={3}
              defaultValue={selectedTeam?.description || ''}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Brief description of this team's responsibilities"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsTeamModalOpen(false);
                setSelectedTeam(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {selectedTeam ? 'Update Team' : 'Create Team'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    Admin: 'bg-purple-100 text-purple-800 border border-purple-200',
    TeamLead: 'bg-blue-100 text-blue-800 border border-blue-200',
    Technician: 'bg-green-100 text-green-800 border border-green-200',
    Viewer: 'bg-slate-100 text-slate-800 border border-slate-200',
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[role]}`}>
      {role}
    </span>
  );
}
