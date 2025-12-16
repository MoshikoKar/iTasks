'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Mail, AlertCircle } from 'lucide-react';

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

    const formData = new FormData(e.currentTarget);
    const data = {
      smtpHost: formData.get('smtpHost') as string,
      smtpPort: parseInt(formData.get('smtpPort') as string, 10),
      smtpFrom: formData.get('smtpFrom') as string,
      smtpSecure: formData.get('smtpSecure') === 'true',
      smtpUser: formData.get('smtpUser') as string || null,
      smtpPassword: formData.get('smtpPassword') as string || null,
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
        <div className="text-slate-500">Loading configuration...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="smtpHost" className="block text-sm font-medium text-slate-700 mb-1">
            SMTP Host <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="smtpHost"
            name="smtpHost"
            required
            defaultValue={config.smtpHost || ''}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="localhost"
          />
        </div>

        <div>
          <label htmlFor="smtpPort" className="block text-sm font-medium text-slate-700 mb-1">
            SMTP Port <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="smtpPort"
            name="smtpPort"
            required
            min="1"
            max="65535"
            defaultValue={config.smtpPort ?? 25}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div>
          <label htmlFor="smtpFrom" className="block text-sm font-medium text-slate-700 mb-1">
            From Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="smtpFrom"
            name="smtpFrom"
            required
            defaultValue={config.smtpFrom || ''}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="no-reply@local"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="smtpSecure"
            name="smtpSecure"
            value="true"
            defaultChecked={config.smtpSecure}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="smtpSecure" className="text-sm font-medium text-slate-700">
            Use secure connection (TLS/SSL)
          </label>
        </div>

        <div>
          <label htmlFor="smtpUser" className="block text-sm font-medium text-slate-700 mb-1">
            SMTP Username (optional)
          </label>
          <input
            type="text"
            id="smtpUser"
            name="smtpUser"
            defaultValue={config.smtpUser || ''}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Leave empty for no authentication"
          />
        </div>

        <div>
          <label htmlFor="smtpPassword" className="block text-sm font-medium text-slate-700 mb-1">
            SMTP Password {config.smtpUser ? <span className="text-red-500">*</span> : '(optional)'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="smtpPassword"
              name="smtpPassword"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder={config.smtpUser ? 'Enter password' : 'Leave empty to keep current password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {config.smtpUser
              ? 'Password is required when username is set'
              : 'Leave empty to keep current password unchanged'}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
