'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Mail, AlertCircle } from 'lucide-react';
import { Checkbox } from './checkbox';

interface SMTPConfig {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword?: string | null;
}

interface SMTPConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SMTPConfigForm({ onSuccess, onCancel }: SMTPConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<SMTPConfig>({
    smtpHost: 'localhost',
    smtpPort: 25,
    smtpFrom: 'no-reply@local',
    smtpSecure: false,
    smtpUser: null,
    smtpPassword: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  // Controlled state for dynamic form fields
  const [smtpHost, setSmtpHost] = useState('localhost');
  const [smtpPort, setSmtpPort] = useState(25);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState('no-reply@local');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  // Auto-update port when secure connection is toggled
  useEffect(() => {
    if (smtpSecure) {
      // If switching to secure and port is still plain SMTP port, change to secure SMTP
      if (smtpPort === 25) {
        setSmtpPort(587); // SMTP with STARTTLS (most common)
      }
    } else {
      // If switching from secure and port is secure SMTP port, change to plain
      if (smtpPort === 587 || smtpPort === 465) {
        setSmtpPort(25);
      }
    }
  }, [smtpSecure]);

  // Smart hostname detection for SMTP URLs
  const handleHostChange = (value: string) => {
    // Check if host contains smtps:// protocol (secure SMTP)
    if (value.toLowerCase().startsWith('smtps://')) {
      setSmtpSecure(true);
      // Extract hostname without protocol
      const cleanHost = value.replace(/^smtps:\/\//i, '');
      return cleanHost;
    }
    // Check if host contains smtp:// protocol (plain SMTP)
    else if (value.toLowerCase().startsWith('smtp://')) {
      setSmtpSecure(false);
      // Extract hostname without protocol
      const cleanHost = value.replace(/^smtp:\/\//i, '');
      return cleanHost;
    }
    return value;
  };

  // Auto-suggest from email based on username/domain patterns
  useEffect(() => {
    if (smtpUser && !smtpFrom.includes('@') && smtpFrom === 'no-reply@local') {
      // If user entered a username that looks like an email
      if (smtpUser.includes('@')) {
        const domain = smtpUser.split('@')[1];
        setSmtpFrom(`noreply@${domain}`);
      }
      // If user entered just a username, try to create a reasonable from address
      else if (smtpUser.length > 0 && smtpHost !== 'localhost') {
        const domain = smtpHost.includes('.') ? smtpHost.split('.').slice(-2).join('.') : smtpHost;
        setSmtpFrom(`noreply@${domain}`);
      }
    }
  }, [smtpUser, smtpHost, smtpFrom]);

  useEffect(() => {
    fetch('/api/system-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConfig({
          smtpHost: data.smtpHost || 'localhost',
          smtpPort: data.smtpPort ?? 25,
          smtpFrom: data.smtpFrom || 'no-reply@local',
          smtpSecure: data.smtpSecure ?? false,
          smtpUser: data.smtpUser || null,
          smtpPassword: null,
        });

        // Set controlled state variables
        setSmtpHost(data.smtpHost || 'localhost');
        setSmtpPort(data.smtpPort ?? 25);
        setSmtpFrom(data.smtpFrom || 'no-reply@local');
        setSmtpSecure(data.smtpSecure ?? false);
        setSmtpUser(data.smtpUser || '');
        setSmtpPassword('');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load configuration');
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const data = {
      smtpHost: smtpHost,
      smtpPort: smtpPort,
      smtpFrom: smtpFrom,
      smtpSecure: smtpSecure,
      smtpUser: smtpUser || null,
      smtpPassword: smtpPassword || null,
    };

    try {
      const response = await fetch('/api/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update SMTP configuration');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-500 dark:text-neutral-400">Loading configuration...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="smtpHost" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            SMTP Host <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            id="smtpHost"
            name="smtpHost"
            required
            value={smtpHost}
            onChange={(e) => setSmtpHost(handleHostChange(e.target.value))}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            placeholder="localhost or smtp://mail.example.com"
          />
        </div>

        <div>
          <label htmlFor="smtpPort" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            SMTP Port <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="number"
            id="smtpPort"
            name="smtpPort"
            required
            min="1"
            max="65535"
            value={smtpPort}
            onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 25)}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {smtpSecure
              ? '587 (SMTP with STARTTLS) or 465 (SMTPS recommended)'
              : '25 (SMTP) or 587 (SMTP with STARTTLS)'}
          </p>
        </div>

        <div>
          <label htmlFor="smtpFrom" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            From Email Address <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="email"
            id="smtpFrom"
            name="smtpFrom"
            required
            value={smtpFrom}
            onChange={(e) => setSmtpFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            placeholder="no-reply@local"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="smtpSecure" className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              id="smtpSecure"
              name="smtpSecure"
              value="true"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-neutral-300 whitespace-nowrap">
              Use secure connection (TLS/SSL)
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="smtpUser" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            SMTP Username (optional)
          </label>
          <input
            type="text"
            id="smtpUser"
            name="smtpUser"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            placeholder="Leave empty for no authentication"
          />
        </div>

        <div>
          <label htmlFor="smtpPassword" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            SMTP Password {smtpUser ? <span className="text-red-500 dark:text-red-400">*</span> : <span className="text-slate-500 dark:text-neutral-400">(optional)</span>}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="smtpPassword"
              name="smtpPassword"
              required={!!smtpUser}
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              placeholder={smtpUser ? 'Enter password' : 'Leave empty to keep current password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-300"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {smtpUser
              ? 'Password is required when username is set'
              : 'Leave empty to keep current password unchanged'}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-neutral-700">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={isLoading}>
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
