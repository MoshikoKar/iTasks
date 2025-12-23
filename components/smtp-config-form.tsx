'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Mail, AlertCircle } from 'lucide-react';
import { Checkbox } from './checkbox';
import { ErrorAlert } from './ui/error-alert';

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
    smtpHost: null,
    smtpPort: null,
    smtpFrom: null,
    smtpSecure: false,
    smtpUser: null,
    smtpPassword: null,
  });
  const [showPassword, setShowPassword] = useState(false);

  // Controlled state for dynamic form fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number | null>(null);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  // Auto-update port when secure connection is toggled
  useEffect(() => {
    if (smtpSecure) {
      // If switching to secure and port is still plain SMTP port, change to secure SMTP
      if (smtpPort === 25 || smtpPort === null) {
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
    if (smtpUser && (!smtpFrom || smtpFrom === '' || smtpFrom === 'no-reply@local')) {
      // If user entered a username that looks like an email
      if (smtpUser.includes('@')) {
        const domain = smtpUser.split('@')[1];
        setSmtpFrom(`noreply@${domain}`);
      }
      // If user entered just a username, try to create a reasonable from address
      else if (smtpUser.length > 0 && smtpHost && smtpHost !== '' && smtpHost !== 'localhost') {
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
          smtpHost: data.smtpHost || null,
          smtpPort: data.smtpPort ?? null,
          smtpFrom: data.smtpFrom || null,
          smtpSecure: data.smtpSecure ?? false,
          smtpUser: data.smtpUser || null,
          smtpPassword: null,
        });

        // Set controlled state variables
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(data.smtpPort ?? null);
        setSmtpFrom(data.smtpFrom || '');
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
      smtpHost: smtpHost && smtpHost.trim() !== '' ? smtpHost : null,
      smtpPort: smtpPort ? smtpPort : null,
      smtpFrom: smtpFrom && smtpFrom.trim() !== '' ? smtpFrom : null,
      smtpSecure: smtpSecure,
      smtpUser: smtpUser && smtpUser.trim() !== '' ? smtpUser : null,
      smtpPassword: smtpPassword && smtpPassword.trim() !== '' ? smtpPassword : null,
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
        <div className="text-muted-foreground">Loading configuration...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <ErrorAlert message={error} onDismiss={() => setError('')} />
      )}

      <div className="space-y-4">
        {/* SMTP Host + SMTP Port */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="smtpHost" className="block text-xs font-medium text-foreground mb-1">
              SMTP Host
            </label>
            <input
              type="text"
              id="smtpHost"
              name="smtpHost"
              value={smtpHost}
              onChange={(e) => setSmtpHost(handleHostChange(e.target.value))}
              className="input-base"
              placeholder="localhost or smtp://mail.example.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">Leave empty to disable SMTP</p>
          </div>

          <div>
            <label htmlFor="smtpPort" className="block text-xs font-medium text-foreground mb-1">
              SMTP Port
            </label>
            <input
              type="number"
              id="smtpPort"
              name="smtpPort"
              min="1"
              max="65535"
              value={smtpPort ?? ''}
              onChange={(e) => setSmtpPort(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="input-base"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {smtpSecure
                ? '587 (SMTP with STARTTLS) or 465 (SMTPS recommended)'
                : '25 (SMTP) or 587 (SMTP with STARTTLS)'}
            </p>
          </div>
        </div>

        {/* From Email Address */}
        <div>
          <label htmlFor="smtpFrom" className="block text-xs font-medium text-foreground mb-1">
            From Email Address
          </label>
          <input
            type="email"
            id="smtpFrom"
            name="smtpFrom"
            value={smtpFrom}
            onChange={(e) => setSmtpFrom(e.target.value)}
            className="input-base"
            placeholder="no-reply@local"
          />
          <p className="mt-1 text-xs text-muted-foreground">Leave empty to disable SMTP</p>
        </div>

        {/* Use secure connection */}
        <div className="flex items-center gap-2">
          <label htmlFor="smtpSecure" className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              id="smtpSecure"
              name="smtpSecure"
              value="true"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
            />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Use secure connection (TLS/SSL)
            </span>
          </label>
        </div>

        {/* SMTP Username + SMTP Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="smtpUser" className="block text-xs font-medium text-foreground mb-1">
              SMTP Username (optional)
            </label>
            <input
              type="text"
              id="smtpUser"
              name="smtpUser"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              className="input-base"
              placeholder="Leave empty for no authentication"
            />
          </div>

          <div>
            <label htmlFor="smtpPassword" className="block text-xs font-medium text-foreground mb-1">
              SMTP Password <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="smtpPassword"
                name="smtpPassword"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="input-base pr-20"
                placeholder="Leave empty for no authentication or to keep current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty for no authentication (e.g., port 25) or to keep current password unchanged
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
