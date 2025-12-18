'use client';

import { useMemo, useState } from 'react';
import { Role } from '@prisma/client';
import { UserPlus, Edit2, Trash2, Building2, Plus, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from './button';
import { useRouter } from 'next/navigation';
import { formatDateTimeStable } from '@/lib/utils/date';
import { ErrorAlert } from './ui/error-alert';

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

interface AdminUsersPageProps {
  users: User[];
  teams: Team[];
  stats: { role: Role; _count: number }[];
}

export function AdminUsersPage({ users, teams, stats }: AdminUsersPageProps) {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Team management state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTeamDeleting, setIsTeamDeleting] = useState(false);
  const [teamError, setTeamError] = useState<string>('');

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
        setTeamError(error.error || 'Failed to save team');
        return;
      }

      setIsTeamModalOpen(false);
      setSelectedTeam(null);
      setTeamError('');
      router.refresh();
    } catch (error) {
      setTeamError('An error occurred while saving the team');
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
        setTeamError(error.error || 'Failed to delete team');
        setIsTeamDeleting(false);
        return;
      }

      setTeamError('');
      router.refresh();
    } catch (error) {
      setTeamError('An error occurred while deleting the team');
      setIsTeamDeleting(false);
    } finally {
      setIsTeamDeleting(false);
    }
  };

  const sortedStats = useMemo(() => {
    const roleOrder: Record<Role, number> = {
      Admin: 1,
      TeamLead: 2,
      Technician: 3,
      Viewer: 4,
    };

    return [...stats].sort((a, b) => {
      const orderA = roleOrder[a.role];
      const orderB = roleOrder[b.role];
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.role.localeCompare(b.role);
    });
  }, [stats]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Users & Teams</h1>

      {/* User Statistics and Teams Management - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Statistics */}
        <section className="card-base p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus size={20} className="text-primary" />
            User Statistics
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {sortedStats.map((stat) => (
              <div key={stat.role} className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-muted-foreground">{stat.role}</div>
                <div className="text-3xl font-bold text-foreground mt-1">{stat._count}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Teams Management */}
        <section className="card-base p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            Teams / Departments
          </h2>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedTeam(null);
              setIsTeamModalOpen(true);
              setTeamError('');
            }}
            className="gap-2"
            style={{ padding: '10px 20px' }}
          >
            <Plus size={16} />
            Create Team
          </Button>
        </div>
        {teamError && (
          <div className="mb-4">
            <ErrorAlert message={teamError} onDismiss={() => setTeamError('')} />
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {teams.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No teams created yet. Create your first team to organize users.
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {team.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => {
                        setSelectedTeam(team);
                        setIsTeamModalOpen(true);
                        setTeamError('');
                      }}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                      aria-label={`Edit team ${team.name}`}
                    >
                      <Edit2 size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team)}
                      disabled={isTeamDeleting}
                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
                      aria-label={`Delete team ${team.name}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                  <UserPlus size={12} />
                  {team._count.members} member{team._count.members !== 1 ? 's' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      </div>

      {/* Users Table */}
      <section className="card-base p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="gap-2" style={{ padding: '10px 20px' }}>
            <UserPlus size={18} />
            Add User
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Team</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Tasks Assigned</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Tasks Created</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.team ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20">
                        <Building2 size={12} />
                        {user.team.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user._count.tasksAssigned}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user._count.tasksCreated}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTimeStable(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary hover:text-primary/80 hover:underline text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-destructive hover:text-destructive/80 hover:underline text-xs font-medium flex items-center gap-1 transition-colors"
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
            <ErrorAlert message={deleteError} onDismiss={() => setDeleteError('')} />
          )}
          <p className="text-foreground">
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
          setTeamError('');
        }}
        title={selectedTeam ? 'Edit Team' : 'Create Team'}
        size="md"
      >
        <form onSubmit={handleSaveTeam} className="space-y-4">
          {teamError && (
            <ErrorAlert message={teamError} onDismiss={() => setTeamError('')} />
          )}
          <div>
            <label htmlFor="team-name" className="block text-sm font-medium text-foreground mb-1">
              Team Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="team-name"
              name="name"
              required
              defaultValue={selectedTeam?.name}
              className="input-base"
              placeholder="e.g., IT Support, Field Technicians"
            />
          </div>

          <div>
            <label htmlFor="team-description" className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              id="team-description"
              name="description"
              rows={3}
              defaultValue={selectedTeam?.description || ''}
              className="input-base"
              placeholder="Brief description of this team's responsibilities"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
    Admin: 'bg-primary/10 text-primary border border-primary/20',
    TeamLead: 'bg-primary/10 text-primary border border-primary/20',
    Technician: 'bg-success/10 text-success border border-success/20',
    Viewer: 'bg-muted text-muted-foreground border border-border',
  };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors[role]}`}>
      {role}
    </span>
  );
}
