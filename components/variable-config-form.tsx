'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { AlertCircle } from 'lucide-react';

interface VariableConfig {
  supportEmail: string | null;
}

interface VariableConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VariableConfigForm({ onSuccess, onCancel }: VariableConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [supportEmail, setSupportEmail] = useState('');

  useEffect(() => {
    fetch('/api/system-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSupportEmail(data.supportEmail || '');
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
      supportEmail: supportEmail || null,
    };

    try {
      const response = await fetch('/api/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update variable configuration');
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
          <label htmlFor="supportEmail" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Support Email Address
          </label>
          <input
            type="email"
            id="supportEmail"
            name="supportEmail"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            placeholder="support@example.com"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            This email will be used for contact form submissions and displayed in the footer.
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
