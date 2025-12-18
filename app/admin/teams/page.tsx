"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Building2, Plus, Edit2, Trash2, X } from "lucide-react";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Button } from "@/components/button";

interface Team {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  team: { id: string; name: string } | null;
}

export default function TeamsManagementPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/users"),
      ]);

      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
        }),
      });

      if (res.ok) {
        setShowTeamModal(false);
        setError('');
        fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to create team");
      }
    } catch (error) {
      setError("Failed to create team");
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeam) return;

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
        }),
      });

      if (res.ok) {
        setShowTeamModal(false);
        setEditingTeam(null);
        setError('');
        fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to update team");
      }
    } catch (error) {
      setError("Failed to update team");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });

      if (res.ok) {
        setError('');
        fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to delete team");
      }
    } catch (error) {
      setError("Failed to delete team");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          role: formData.get("role"),
          teamId: formData.get("teamId") || null,
        }),
      });

      if (res.ok) {
        setShowUserModal(false);
        setEditingUser(null);
        setError('');
        fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to update user");
      }
    } catch (error) {
      setError("Failed to update user");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Team & User Management</h1>
        <p className="mt-1 text-muted-foreground">Manage teams and assign users to departments</p>
      </div>

      {error && (
        <ErrorAlert message={error} onDismiss={() => setError('')} />
      )}

      {/* Teams Section */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            Teams / Departments
          </h2>
          <Button
            onClick={() => {
              setEditingTeam(null);
              setShowTeamModal(true);
              setError('');
            }}
            size="sm"
            className="gap-2"
          >
            <Plus size={16} />
            Create Team
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => {
                      setEditingTeam(team);
                      setShowTeamModal(true);
                      setError('');
                    }}
                    className="p-1 text-primary hover:bg-primary/10 rounded"
                    aria-label={`Edit team ${team.name}`}
                  >
                    <Edit2 size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                    aria-label={`Delete team ${team.name}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {team._count.members} member{team._count.members !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users Section */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Users & Team Assignments
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Team</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.team?.name || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setShowUserModal(true);
                        setError('');
                      }}
                      className="text-primary hover:text-primary/80 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingTeam ? "Edit Team" : "Create Team"}
              </h3>
              <button
                onClick={() => {
                  setShowTeamModal(false);
                  setEditingTeam(null);
                  setError('');
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam} className="space-y-4">
              {error && (
                <ErrorAlert message={error} onDismiss={() => setError('')} />
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Team Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingTeam?.name}
                  required
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingTeam?.description || ""}
                  rows={3}
                  className="input-base"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingTeam ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowTeamModal(false);
                    setEditingTeam(null);
                    setError('');
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Edit User</h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setError('');
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {error && (
                <ErrorAlert message={error} onDismiss={() => setError('')} />
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUser.name}
                  required
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingUser.email}
                  required
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role <span className="text-destructive">*</span></label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  required
                  className="input-base"
                >
                  <option value="Admin">Admin</option>
                  <option value="TeamLead">Team Lead</option>
                  <option value="Technician">Technician</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Team</label>
                <select
                  name="teamId"
                  defaultValue={editingUser.teamId || ""}
                  className="input-base"
                >
                  <option value="">No Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  Update
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setError('');
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
