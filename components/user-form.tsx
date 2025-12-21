'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { Button } from './button';
import { AlertCircle } from 'lucide-react';
import { ErrorAlert } from './ui/error-alert';
import { useCSRF } from '@/hooks/useCSRF';

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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { csrfToken, loading: csrfLoading, getHeaders } = useCSRF();

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

    if (csrfLoading || !csrfToken) {
      setError('CSRF token not ready. Please wait and try again.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const passwordValue = formData.get('password') as string;
    const confirmPasswordValue = formData.get('confirmPassword') as string;

    // Validate password confirmation for new users or when password is provided
    if (!user) {
      // For new users, both passwords are required and must match
      if (passwordValue !== confirmPasswordValue) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
    } else if (passwordValue || confirmPasswordValue) {
      // For existing users, if either password field is filled, both must match
      if (passwordValue !== confirmPasswordValue) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
    }

    const data: any = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as Role,
      password: passwordValue,
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
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        credentials: 'same-origin',
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
        <ErrorAlert message={error} onDismiss={() => setError('')} />
      )}

      {/* Full Name + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
            Full Name (Display Name) <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={user?.name}
            className="input-base"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            defaultValue={user?.email}
            className="input-base"
            placeholder="john.doe@company.com"
          />
        </div>
      </div>

      {/* Role + Team / Department */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="role" className="block text-xs font-medium text-foreground mb-1">
            Role <span className="text-destructive">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue={user?.role || 'Technician'}
            className="input-base"
          >
            <option value="Admin">Admin</option>
            <option value="TeamLead">Team Lead</option>
            <option value="Technician">Technician</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>

        <div>
          <label htmlFor="teamId" className="block text-xs font-medium text-foreground mb-1">
            Team / Department
          </label>
          <select
            id="teamId"
            name="teamId"
            defaultValue={user?.teamId || ''}
            className="input-base"
          >
            <option value="">No Team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Assign user to a team for RBAC filtering
          </p>
        </div>
      </div>

      {/* Password + Confirm Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-foreground mb-1">
            Password {!user && <span className="text-destructive">*</span>}
            {user && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required={!user}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base"
            placeholder={user ? "Leave blank to keep current password" : "Enter password"}
            minLength={6}
          />
          {!user && (
            <p className="mt-1.5 text-xs text-muted-foreground">Minimum 6 characters</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-foreground mb-1">
            Confirm Password {!user && <span className="text-destructive">*</span>}
            {user && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            required={!user}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-base"
            placeholder={user ? "Leave blank to keep current password" : "Confirm password"}
            minLength={6}
          />
          {password && confirmPassword && password !== confirmPassword && (
            <p className="mt-1.5 text-xs text-destructive">Passwords do not match</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="submit" variant="primary" isLoading={isLoading || csrfLoading} disabled={csrfLoading || !csrfToken}>
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
