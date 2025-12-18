'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { Checkbox } from './checkbox';

interface LDAPConfig {
  ldapEnabled: boolean;
  ldapHost: string;
  ldapPort: number;
  ldapBaseDn: string;
  ldapBindDn: string;
  ldapUseTls: boolean;
  ldapUserSearchFilter: string;
  ldapUsernameAttribute: string;
  ldapEnforced: boolean;
}

interface LDAPConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LDAPConfigForm({ onSuccess, onCancel }: LDAPConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [config, setConfig] = useState<LDAPConfig>({
    ldapEnabled: false,
    ldapHost: '',
    ldapPort: 389,
    ldapBaseDn: '',
    ldapBindDn: '',
    ldapUseTls: false,
    ldapUserSearchFilter: '(uid={{username}})',
    ldapUsernameAttribute: 'uid',
    ldapEnforced: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [ldapPassword, setLdapPassword] = useState('');
  const [useAutoDiscovery, setUseAutoDiscovery] = useState(true);
  const [ldapUsername, setLdapUsername] = useState('');
  const [ldapDomain, setLdapDomain] = useState('');
  const [discoveredBindDn, setDiscoveredBindDn] = useState('');
  const [discoveredBaseDn, setDiscoveredBaseDn] = useState('');

  // Controlled state for dynamic form fields
  const [ldapHost, setLdapHost] = useState('');
  const [ldapPort, setLdapPort] = useState(389);
  const [ldapUseTls, setLdapUseTls] = useState(false);

  // Auto-update port when TLS is toggled
  useEffect(() => {
    if (ldapUseTls) {
      // If switching to TLS and port is still default LDAP port, change to LDAPS
      if (ldapPort === 389) {
        setLdapPort(636);
      }
    } else {
      // If switching from TLS and port is LDAPS port, change to LDAP
      if (ldapPort === 636) {
        setLdapPort(389);
      }
    }
  }, [ldapUseTls]);

  // Smart hostname detection for LDAPS URLs
  const handleHostChange = (value: string) => {
    // Check if host contains ldaps:// protocol
    if (value.toLowerCase().startsWith('ldaps://')) {
      setLdapUseTls(true);
      // Extract hostname without protocol
      const cleanHost = value.replace(/^ldaps:\/\//i, '');
      return cleanHost;
    }
    // Check if host contains ldap:// protocol
    else if (value.toLowerCase().startsWith('ldap://')) {
      setLdapUseTls(false);
      // Extract hostname without protocol
      const cleanHost = value.replace(/^ldap:\/\//i, '');
      return cleanHost;
    }
    return value;
  };

  // Auto-suggest LDAP settings based on domain patterns
  useEffect(() => {
    if (ldapDomain && config.ldapUserSearchFilter === '(uid={{username}})' && config.ldapUsernameAttribute === 'uid') {
      // If domain looks like Active Directory (contains dots and common AD TLDs)
      const isLikelyAD = /\.(com|org|net|local|internal)$/i.test(ldapDomain) || ldapDomain.split('.').length > 2;
      if (isLikelyAD) {
        // Suggest Active Directory defaults
        setConfig(prev => ({
          ...prev,
          ldapUserSearchFilter: '(sAMAccountName={{username}})',
          ldapUsernameAttribute: 'sAMAccountName'
        }));
      }
    }
  }, [ldapDomain, config.ldapUserSearchFilter, config.ldapUsernameAttribute]);

  useEffect(() => {
    fetch('/api/ldap/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConfig({
          ldapEnabled: data.ldapEnabled || false,
          ldapHost: data.ldapHost || '',
          ldapPort: data.ldapPort ?? 389,
          ldapBaseDn: data.ldapBaseDn || '',
          ldapBindDn: data.ldapBindDn || '',
          ldapUseTls: data.ldapUseTls ?? false,
          ldapUserSearchFilter: data.ldapUserSearchFilter || '(uid={{username}})',
          ldapUsernameAttribute: data.ldapUsernameAttribute || 'uid',
          ldapEnforced: data.ldapEnforced || false,
        });

        // Set controlled state variables
        setLdapHost(data.ldapHost || '');
        setLdapPort(data.ldapPort ?? 389);
        setLdapUseTls(data.ldapUseTls ?? false);

        // Set discovered values from existing config
        if (data.ldapBindDn) {
          setDiscoveredBindDn(data.ldapBindDn);
        }
        if (data.ldapBaseDn) {
          setDiscoveredBaseDn(data.ldapBaseDn);
        }

        // Try to extract username and domain from existing Bind DN
        if (data.ldapBindDn) {
          // Check if it's domain\username format (Windows/AD format)
          const domainUserMatch = data.ldapBindDn.match(/^(.+)\\(.+)$/);
          if (domainUserMatch) {
            // Set combined format in username field
            setLdapUsername(data.ldapBindDn); // Store full format
            setLdapDomain(domainUserMatch[1]);
            setUseAutoDiscovery(true);
          }
          // Check if it's UPN format (username@domain)
          else if (data.ldapBindDn.includes('@')) {
            // Set combined format in username field
            setLdapUsername(data.ldapBindDn); // Store full format
            const upnMatch = data.ldapBindDn.match(/^([^@]+)@(.+)$/);
            if (upnMatch) {
              setLdapDomain(upnMatch[2]);
            }
            setUseAutoDiscovery(true);
          } else {
            // Try to extract from DN format (cn=username,cn=Users,dc=domain,dc=com)
            const dnMatch = data.ldapBindDn.match(/cn=([^,]+)/);
            if (dnMatch) {
              setLdapUsername(dnMatch[1]);
            }
            // Extract domain from Base DN
            if (data.ldapBaseDn) {
              const domainParts = data.ldapBaseDn.match(/dc=([^,]+)/g);
              if (domainParts) {
                const domain = domainParts.map((p: string) => p.replace('dc=', '')).join('.');
                setLdapDomain(domain);
              }
            }
          }
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load configuration');
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, []);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);
    setError('');

    const form = (e.target as HTMLFormElement).form;
    if (!form) return;

    const formData = new FormData(form);
    const ldapBindPassword = formData.get('ldapBindPassword') as string;

    if (useAutoDiscovery) {
      const usernameInput = formData.get('ldapUsername') as string;
      const domainInput = formData.get('ldapDomain') as string;
      const baseDn = formData.get('ldapBaseDn') as string || undefined;

      // Parse username and domain from input
      let username = usernameInput;
      let domain = domainInput;
      
      // If username field contains domain\username or username@domain, parse it
      if (usernameInput.includes('\\') || usernameInput.includes('@')) {
        const parts = usernameInput.includes('\\') 
          ? usernameInput.split('\\') 
          : usernameInput.split('@');
        if (parts.length === 2) {
          if (usernameInput.includes('\\')) {
            domain = parts[0];
            username = parts[1];
          } else {
            username = parts[0];
            domain = parts[1];
          }
        }
      }

      if (!ldapHost || !ldapPort || !username || !domain || !ldapBindPassword) {
        setError('Please fill in all required fields before testing');
        setIsTesting(false);
        return;
      }

      try {
        const response = await fetch('/api/ldap/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ldapHost,
            ldapPort,
            ldapUsername: username,
            ldapDomain: domain,
            ldapBindPassword,
            ldapUseTls,
            ldapBaseDn: baseDn,
            useAutoDiscovery: true,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setDiscoveredBindDn(result.discoveredBindDn || '');
          setDiscoveredBaseDn(result.discoveredBaseDn || '');
          setTestResult({
            success: true,
            message: `Connection successful! Auto-discovered Bind DN and Base DN.`,
          });
        } else {
          setTestResult({
            success: false,
            message: result.error || 'Connection failed',
          });
          if (result.discoveredBaseDn) {
            setDiscoveredBaseDn(result.discoveredBaseDn);
          }
        }
      } catch (err) {
        setTestResult({ success: false, message: err instanceof Error ? err.message : 'Connection test failed' });
      } finally {
        setIsTesting(false);
      }
    } else {
      const testData = {
        ldapHost,
        ldapPort,
        ldapBaseDn: formData.get('ldapBaseDn') as string,
        ldapBindDn: formData.get('ldapBindDn') as string,
        ldapBindPassword,
        ldapUseTls,
        ldapUserSearchFilter: formData.get('ldapUserSearchFilter') as string,
        ldapUsernameAttribute: formData.get('ldapUsernameAttribute') as string,
        useAutoDiscovery: false,
      };

      if (!testData.ldapHost || !testData.ldapPort || !testData.ldapBaseDn || !testData.ldapBindDn || !testData.ldapBindPassword) {
        setError('Please fill in all required fields before testing');
        setIsTesting(false);
        return;
      }

      try {
        const response = await fetch('/api/ldap/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData),
        });

        const result = await response.json();

        if (result.success) {
          setTestResult({ success: true, message: 'Connection successful! LDAP server is reachable and credentials are valid.' });
        } else {
          setTestResult({ success: false, message: result.error || 'Connection failed' });
        }
      } catch (err) {
        setTestResult({ success: false, message: err instanceof Error ? err.message : 'Connection test failed' });
      } finally {
        setIsTesting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setTestResult(null);

    const formData = new FormData(e.currentTarget);
    
    // Parse username and domain if using auto-discovery
    let username = formData.get('ldapUsername') as string;
    let domain = formData.get('ldapDomain') as string;
    
    if (useAutoDiscovery && username) {
      // If username field contains domain\username or username@domain, parse it
      if (username.includes('\\') || username.includes('@')) {
        const parts = username.includes('\\') 
          ? username.split('\\') 
          : username.split('@');
        if (parts.length === 2) {
          if (username.includes('\\')) {
            domain = parts[0];
            username = parts[1];
          } else {
            username = parts[0];
            domain = parts[1];
          }
        }
      }
    }
    
    // If auto-discovery was used and successful, use discovered values
    const baseDn = discoveredBaseDn || formData.get('ldapBaseDn') as string;
    const bindDn = discoveredBindDn || formData.get('ldapBindDn') as string;
    
    // Validation: If using auto-discovery mode, Bind DN must be discovered
    if (useAutoDiscovery && !bindDn) {
      setError('Please click "Test Connection" first to auto-discover the Bind DN before saving.');
      setIsLoading(false);
      return;
    }
    
    // Validation: Bind DN is required
    if (!bindDn || bindDn.trim() === '') {
      setError('Bind DN is required. Please use auto-discovery or enter it manually.');
      setIsLoading(false);
      return;
    }
    
    // Validation: If using auto-discovery, username and domain are required
    if (useAutoDiscovery && (!username || !domain)) {
      setError('Please enter service account in format: domain\\username or username@domain');
      setIsLoading(false);
      return;
    }
    
    const data = {
      ldapEnabled: formData.get('ldapEnabled') === 'true',
      ldapHost: ldapHost,
      ldapPort: ldapPort,
      ldapBaseDn: baseDn,
      ldapBindDn: bindDn,
      ldapBindPassword: formData.get('ldapBindPassword') as string || null,
      ldapUseTls: ldapUseTls,
      ldapUserSearchFilter: formData.get('ldapUserSearchFilter') as string,
      ldapUsernameAttribute: formData.get('ldapUsernameAttribute') as string,
      ldapEnforced: formData.get('ldapEnforced') === 'true',
    };

    try {
      const response = await fetch('/api/ldap/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update LDAP configuration');
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

      {testResult && (
        <div className={`rounded-lg border p-3 flex items-start gap-3 ${
          testResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        }`}>
          {testResult.success ? (
            <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={20} />
          )}
          <span className={`text-sm ${testResult.success ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
            {testResult.message}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-neutral-700">
          <label htmlFor="ldapEnabled" className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              id="ldapEnabled"
              name="ldapEnabled"
              value="true"
              defaultChecked={config.ldapEnabled}
            />
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100 whitespace-nowrap">
              Enable LDAP Authentication
            </span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="ldapHost" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
              LDAP Host <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              id="ldapHost"
              name="ldapHost"
              required
              value={ldapHost}
              onChange={(e) => setLdapHost(handleHostChange(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
              placeholder="ldap.example.com or ldaps://ldap.example.com"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Hostname or IP address of the LDAP server</p>
          </div>

          <div>
            <label htmlFor="ldapPort" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
              Port <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="number"
              id="ldapPort"
              name="ldapPort"
              required
              min="1"
              max="65535"
              value={ldapPort}
              onChange={(e) => setLdapPort(parseInt(e.target.value, 10) || 389)}
              className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
              {ldapUseTls ? '636 (LDAPS recommended)' : '389 (LDAP) or 636 (LDAPS)'}
            </p>
          </div>

          <div className="flex flex-col">
            <div className="h-5 mb-1" />
            <div className="h-[42px] flex items-center">
              <label htmlFor="ldapUseTls" className="inline-flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  id="ldapUseTls"
                  name="ldapUseTls"
                  value="true"
                  checked={ldapUseTls}
                  onChange={(e) => setLdapUseTls(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                  Use TLS/LDAPS
                </span>
              </label>
            </div>
            <div className="h-5" />
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-neutral-700">
          <label htmlFor="useAutoDiscovery" className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              id="useAutoDiscovery"
              checked={useAutoDiscovery}
              onChange={(e) => setUseAutoDiscovery(e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100 whitespace-nowrap">
              Auto-Discover Bind DN and Base DN
            </span>
          </label>
        </div>

        {useAutoDiscovery ? (
          <>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">Supported Formats:</p>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                • Single field: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-900 dark:text-blue-200">domain\username</code> or <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-900 dark:text-blue-200">username@domain</code><br/>
                • Or separate: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-900 dark:text-blue-200">username</code> + <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-900 dark:text-blue-200">domain</code>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="ldapUsername" className="flex items-center whitespace-nowrap text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1 h-5">
                  Service Account <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="ldapUsername"
                  name="ldapUsername"
                  required={useAutoDiscovery}
                  value={
                    ldapUsername.includes('\\') || ldapUsername.includes('@')
                      ? ldapUsername
                      : ldapDomain && ldapUsername
                      ? `${ldapDomain}\\${ldapUsername}`
                      : ldapUsername
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    // If user enters domain\username or username@domain, parse it
                    if (value.includes('\\') || value.includes('@')) {
                      const parts = value.includes('\\')
                        ? value.split('\\')
                        : value.split('@');
                      if (parts.length === 2) {
                        if (value.includes('\\')) {
                          // domain\username format
                          setLdapDomain(parts[0]);
                          setLdapUsername(value); // Store full format
                        } else {
                          // username@domain format
                          setLdapUsername(value); // Store full format
                          setLdapDomain(parts[1]);
                        }
                      } else {
                        setLdapUsername(value);
                        setLdapDomain('');
                      }
                    } else {
                      // Just username, keep domain if it exists
                      setLdapUsername(value);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                  placeholder="Domain\username or email"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                  Enter service account in format: <code className="bg-slate-100 dark:bg-neutral-700 px-1 rounded text-slate-900 dark:text-neutral-100">domain\username</code> or <code className="bg-slate-100 dark:bg-neutral-700 px-1 rounded text-slate-900 dark:text-neutral-100">username@domain</code>
                </p>
              </div>

              <div>
                <label htmlFor="ldapBindPassword" className="flex items-center whitespace-nowrap text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1 h-5">
                  Password <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="ldapBindPassword"
                    name="ldapBindPassword"
                    required
                    value={ldapPassword}
                    onChange={(e) => setLdapPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                    placeholder="Service account password"
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
                  Service account password for binding to LDAP (encrypted at rest)
                </p>
              </div>

              <div>
                <label htmlFor="ldapBaseDn" className="flex items-center justify-between whitespace-nowrap text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1 h-5">
                  <span>Base DN</span>
                  <span className="text-xs font-normal text-slate-400 dark:text-neutral-500 whitespace-nowrap">(optional, auto-generated)</span>
                </label>
                <input
                  type="text"
                  id="ldapBaseDn"
                  name="ldapBaseDn"
                  value={discoveredBaseDn || config.ldapBaseDn}
                  onChange={(e) => setDiscoveredBaseDn(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                  placeholder="dc=company,dc=com (auto-generated)"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                  {discoveredBaseDn ? 'Auto-discovered from domain' : 'Will be auto-generated from domain if empty'}
                </p>
              </div>
            </div>

            {!ldapUsername.includes('\\') && !ldapUsername.includes('@') && (
              <div>
                <label htmlFor="ldapDomain" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  Domain <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="ldapDomain"
                  name="ldapDomain"
                  required={useAutoDiscovery && !ldapUsername.includes('\\') && !ldapUsername.includes('@')}
                  value={ldapDomain}
                  onChange={(e) => setLdapDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                  placeholder="example.com"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Active Directory domain (only needed if username doesn't include domain)</p>
              </div>
            )}
            {/* Hidden inputs to persist discovered values in form */}
            {discoveredBindDn && (
              <input type="hidden" name="ldapBindDn" value={discoveredBindDn} />
            )}
            {discoveredBaseDn && (
              <input type="hidden" name="ldapBaseDn" value={discoveredBaseDn} />
            )}
            
            {(discoveredBindDn || discoveredBaseDn) && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-1.5">
                {discoveredBindDn && (
                  <div>
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-300">Auto-Discovered Bind DN: </span>
                    <span className="text-xs text-blue-800 dark:text-blue-300 font-mono break-all">{discoveredBindDn}</span>
                  </div>
                )}
                {discoveredBaseDn && (
                  <div>
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-300">Auto-Discovered Base DN: </span>
                    <span className="text-xs text-blue-800 dark:text-blue-300 font-mono break-all">{discoveredBaseDn}</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label htmlFor="ldapBaseDn" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Base DN <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                id="ldapBaseDn"
                name="ldapBaseDn"
                required={!useAutoDiscovery}
                defaultValue={config.ldapBaseDn}
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                placeholder="dc=example,dc=com"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Base Distinguished Name for user searches</p>
            </div>

            <div>
              <label htmlFor="ldapBindDn" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                Bind DN <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                id="ldapBindDn"
                name="ldapBindDn"
                required={!useAutoDiscovery}
                defaultValue={config.ldapBindDn}
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                placeholder="cn=admin,dc=example,dc=com"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Service account DN for binding to LDAP</p>
            </div>
          </>
        )}

        {!useAutoDiscovery && (
          <div>
            <label htmlFor="ldapBindPassword" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
              Password <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="ldapBindPassword"
                name="ldapBindPassword"
                required
                value={ldapPassword}
                onChange={(e) => setLdapPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                placeholder="Enter password (leave empty to keep current)"
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
              Password for the bind DN (encrypted at rest, leave empty to keep current)
            </p>
          </div>
        )}

        <div>
          <label htmlFor="ldapUserSearchFilter" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
            User Search Filter
          </label>
          <input
            type="text"
            id="ldapUserSearchFilter"
            name="ldapUserSearchFilter"
            defaultValue={config.ldapUserSearchFilter}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            placeholder="(sAMAccountName={{username}})"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            LDAP filter for finding users. Use {'{'}{'{'} username {'}'} {'}'} as placeholder
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            ⚠️ For Active Directory, use: <code className="bg-amber-50 dark:bg-amber-900/30 px-1 rounded text-amber-900 dark:text-amber-200">(sAMAccountName=&#123;&#123;username&#125;&#125;)</code>
          </p>
        </div>

        <div>
          <label htmlFor="ldapUsernameAttribute" className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
            Username Attribute
          </label>
          <input
            type="text"
            id="ldapUsernameAttribute"
            name="ldapUsernameAttribute"
            defaultValue={config.ldapUsernameAttribute}
            className="w-full rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
            placeholder="sAMAccountName"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            LDAP attribute containing the username
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            ⚠️ For Active Directory, use: <code className="bg-amber-50 dark:bg-amber-900/30 px-1 rounded text-amber-900 dark:text-amber-200">sAMAccountName</code> (not uid)
          </p>
        </div>

        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Shield className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={16} />
          <div className="flex-1">
            <label htmlFor="ldapEnforced" className="inline-flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                id="ldapEnforced"
                name="ldapEnforced"
                value="true"
                defaultChecked={config.ldapEnforced}
              />
              <span className="text-sm font-medium text-slate-900 dark:text-neutral-100 whitespace-nowrap">
                Enforce LDAP authentication
              </span>
            </label>
            <p className="mt-1 text-xs text-slate-600 dark:text-neutral-400">
              When enabled, only LDAP authentication is allowed (except for the bootstrap admin). Local users cannot log in.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t border-slate-200 dark:border-neutral-700">
        <Button
          type="button"
          variant="secondary"
          onClick={handleTestConnection}
          isLoading={isTesting}
        >
          Test Connection
        </Button>
        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Configuration
          </Button>
        </div>
      </div>
    </form>
  );
}
