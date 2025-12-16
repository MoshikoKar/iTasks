'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { Button } from './button';
import { AlertCircle } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface UserFormProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    teamId?: string | null;
  };
  onSuccess?: () => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    // Fetch teams for the dropdown
    fetch('/api/teams')
      .then(res => res.ok ? res.json() : [])
      .then(data => setTeams(data))
      .catch(() => setTeams([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as Role,
      password: formData.get('password') as string,
      teamId: formData.get('teamId') as string || null,
    };

    // Only include password if it's provided (for edits)
    if (user && !data.password) {
      delete data.password;
    }

    try {
      const url = user ? `/api/users/${user.id}` : '/api/users';
      const method = user ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={user?.name}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          defaultValue={user?.email}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          placeholder="john.doe@company.com"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue={user?.role || 'Technician'}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          <option value="Admin">Admin</option>
          <option value="TeamLead">Team Lead</option>
          <option value="Technician">Technician</option>
          <option value="Viewer">Viewer</option>
        </select>
      </div>

      <div>
        <label htmlFor="teamId" className="block text-sm font-medium text-slate-700 mb-1">
          Team / Department
        </label>
        <select
          id="teamId"
          name="teamId"
          defaultValue={user?.teamId || ''}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          <option value="">No Team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-slate-500">
          Assign user to a team for RBAC filtering
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          Password {!user && <span className="text-red-500">*</span>}
          {user && <span className="text-slate-500 text-xs">(leave blank to keep current)</span>}
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required={!user}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          placeholder={user ? "Leave blank to keep current password" : "Enter password"}
          minLength={6}
        />
        {!user && (
          <p className="mt-1.5 text-xs text-slate-500">Minimum 6 characters</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
