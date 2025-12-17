'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { AlertCircle, Clock } from 'lucide-react';

interface SLADefaults {
  slaLowHours: number | null;
  slaMediumHours: number | null;
  slaHighHours: number | null;
  slaCriticalHours: number | null;
}

interface SLAConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SLAConfigForm({ onSuccess, onCancel }: SLAConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<SLADefaults>({
    slaLowHours: 120,
    slaMediumHours: 48,
    slaHighHours: 24,
    slaCriticalHours: 4,
  });

  useEffect(() => {
    fetch('/api/system-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConfig({
          slaLowHours: data.slaLowHours ?? 120,
          slaMediumHours: data.slaMediumHours ?? 48,
          slaHighHours: data.slaHighHours ?? 24,
          slaCriticalHours: data.slaCriticalHours ?? 4,
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
      slaLowHours: parseInt(formData.get('slaLowHours') as string, 10),
      slaMediumHours: parseInt(formData.get('slaMediumHours') as string, 10),
      slaHighHours: parseInt(formData.get('slaHighHours') as string, 10),
      slaCriticalHours: parseInt(formData.get('slaCriticalHours') as string, 10),
    };

    if (Object.values(data).some((val) => isNaN(val) || val <= 0)) {
      setError('All SLA values must be positive numbers');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update SLA defaults');
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
    return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
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

      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 mb-4">
        <div className="flex items-start gap-3">
          <Clock className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">SLA Defaults</p>
            <p>
              Configure default Service Level Agreement deadlines (in hours) for each priority level.
              When a task is created, the SLA deadline will be automatically calculated based on these defaults.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="slaCriticalHours" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Critical Priority (hours) <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="number"
            id="slaCriticalHours"
            name="slaCriticalHours"
            required
            min="1"
            defaultValue={config.slaCriticalHours ?? 4}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Default: {formatHours(config.slaCriticalHours ?? 4)} - Tasks with Critical priority must be resolved within this time
          </p>
        </div>

        <div>
          <label htmlFor="slaHighHours" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            High Priority (hours) <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="number"
            id="slaHighHours"
            name="slaHighHours"
            required
            min="1"
            defaultValue={config.slaHighHours ?? 24}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Default: {formatHours(config.slaHighHours ?? 24)} - Tasks with High priority must be resolved within this time
          </p>
        </div>

        <div>
          <label htmlFor="slaMediumHours" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Medium Priority (hours) <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="number"
            id="slaMediumHours"
            name="slaMediumHours"
            required
            min="1"
            defaultValue={config.slaMediumHours ?? 48}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Default: {formatHours(config.slaMediumHours ?? 48)} - Tasks with Medium priority must be resolved within this time
          </p>
        </div>

        <div>
          <label htmlFor="slaLowHours" className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Low Priority (hours) <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="number"
            id="slaLowHours"
            name="slaLowHours"
            required
            min="1"
            defaultValue={config.slaLowHours ?? 120}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 py-2.5 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            Default: {formatHours(config.slaLowHours ?? 120)} - Tasks with Low priority must be resolved within this time
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
          Save SLA Defaults
        </Button>
      </div>
    </form>
  );
}
