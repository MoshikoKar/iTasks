'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

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
                const domain = domainParts.map(p => p.replace('dc=', '')).join('.');
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
    const ldapHost = formData.get('ldapHost') as string;
    const ldapPort = parseInt(formData.get('ldapPort') as string, 10);
    const ldapBindPassword = formData.get('ldapBindPassword') as string;
    const ldapUseTls = formData.get('ldapUseTls') === 'true';

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
      ldapHost: formData.get('ldapHost') as string,
      ldapPort: parseInt(formData.get('ldapPort') as string, 10),
      ldapBaseDn: baseDn,
      ldapBindDn: bindDn,
      ldapBindPassword: formData.get('ldapBindPassword') as string || null,
      ldapUseTls: formData.get('ldapUseTls') === 'true',
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

      {testResult && (
        <div className={`rounded-lg border p-3 flex items-start gap-3 ${
          testResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          {testResult.success ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
          )}
          <span className={`text-sm ${testResult.success ? 'text-green-800' : 'text-orange-800'}`}>
            {testResult.message}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <input
            type="checkbox"
            id="ldapEnabled"
            name="ldapEnabled"
            value="true"
            defaultChecked={config.ldapEnabled}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="ldapEnabled" className="text-sm font-semibold text-slate-900">
            Enable LDAP Authentication
          </label>
        </div>

        <div>
          <label htmlFor="ldapHost" className="block text-sm font-medium text-slate-700 mb-1">
            LDAP Host <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="ldapHost"
            name="ldapHost"
            required
            defaultValue={config.ldapHost}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="ldap.example.com"
          />
          <p className="mt-1 text-xs text-slate-500">Hostname or IP address of the LDAP server</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ldapPort" className="block text-sm font-medium text-slate-700 mb-1">
              Port <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="ldapPort"
              name="ldapPort"
              required
              min="1"
              max="65535"
              defaultValue={config.ldapPort}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <p className="mt-1 text-xs text-slate-500">389 (LDAP) or 636 (LDAPS)</p>
          </div>

          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="ldapUseTls"
              name="ldapUseTls"
              value="true"
              defaultChecked={config.ldapUseTls}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="ldapUseTls" className="ml-2 text-sm font-medium text-slate-700">
              Use TLS/LDAPS
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <input
            type="checkbox"
            id="useAutoDiscovery"
            checked={useAutoDiscovery}
            onChange={(e) => setUseAutoDiscovery(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="useAutoDiscovery" className="text-sm font-semibold text-slate-900">
            Auto-Discover Bind DN and Base DN
          </label>
        </div>

        {useAutoDiscovery ? (
          <>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-xs font-medium text-blue-900 mb-1">Supported Formats:</p>
              <p className="text-xs text-blue-800">
                • Single field: <code className="bg-blue-100 px-1 rounded">domain\username</code> or <code className="bg-blue-100 px-1 rounded">username@domain</code><br/>
                • Or separate: <code className="bg-blue-100 px-1 rounded">username</code> + <code className="bg-blue-100 px-1 rounded">domain</code>
              </p>
            </div>
            <div>
              <label htmlFor="ldapUsername" className="block text-sm font-medium text-slate-700 mb-1">
                Service Account <span className="text-red-500">*</span>
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
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="mindcti.com\\symantec or symantec@mindcti.com"
              />
              <p className="mt-1 text-xs text-slate-500">
                Enter service account in format: <code className="bg-slate-100 px-1 rounded">domain\username</code> or <code className="bg-slate-100 px-1 rounded">username@domain</code>
              </p>
            </div>
            {!ldapUsername.includes('\\') && !ldapUsername.includes('@') && (
              <div>
                <label htmlFor="ldapDomain" className="block text-sm font-medium text-slate-700 mb-1">
                  Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="ldapDomain"
                  name="ldapDomain"
                  required={useAutoDiscovery && !ldapUsername.includes('\\') && !ldapUsername.includes('@')}
                  value={ldapDomain}
                  onChange={(e) => setLdapDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="mindcti.com"
                />
                <p className="mt-1 text-xs text-slate-500">Active Directory domain (only needed if username doesn't include domain)</p>
              </div>
            )}
            <div>
              <label htmlFor="ldapBaseDn" className="block text-sm font-medium text-slate-700 mb-1">
                Base DN <span className="text-slate-400">(optional, auto-generated from domain)</span>
              </label>
              <input
                type="text"
                id="ldapBaseDn"
                name="ldapBaseDn"
                value={discoveredBaseDn || config.ldapBaseDn}
                onChange={(e) => setDiscoveredBaseDn(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="dc=company,dc=com (auto-generated)"
              />
              <p className="mt-1 text-xs text-slate-500">
                {discoveredBaseDn ? 'Auto-discovered from domain' : 'Will be auto-generated from domain if empty'}
              </p>
            </div>
            {/* Hidden inputs to persist discovered values in form */}
            {discoveredBindDn && (
              <input type="hidden" name="ldapBindDn" value={discoveredBindDn} />
            )}
            {discoveredBaseDn && (
              <input type="hidden" name="ldapBaseDn" value={discoveredBaseDn} />
            )}
            
            {(discoveredBindDn || discoveredBaseDn) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                {discoveredBindDn && (
                  <div>
                    <p className="text-xs font-medium text-blue-900 mb-1">Auto-Discovered Bind DN:</p>
                    <p className="text-sm text-blue-800 font-mono break-all">{discoveredBindDn}</p>
                  </div>
                )}
                {discoveredBaseDn && (
                  <div>
                    <p className="text-xs font-medium text-blue-900 mb-1">Auto-Discovered Base DN:</p>
                    <p className="text-sm text-blue-800 font-mono break-all">{discoveredBaseDn}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label htmlFor="ldapBaseDn" className="block text-sm font-medium text-slate-700 mb-1">
                Base DN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ldapBaseDn"
                name="ldapBaseDn"
                required={!useAutoDiscovery}
                defaultValue={config.ldapBaseDn}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="dc=example,dc=com"
              />
              <p className="mt-1 text-xs text-slate-500">Base Distinguished Name for user searches</p>
            </div>

            <div>
              <label htmlFor="ldapBindDn" className="block text-sm font-medium text-slate-700 mb-1">
                Bind DN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ldapBindDn"
                name="ldapBindDn"
                required={!useAutoDiscovery}
                defaultValue={config.ldapBindDn}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="cn=admin,dc=example,dc=com"
              />
              <p className="mt-1 text-xs text-slate-500">Service account DN for binding to LDAP</p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="ldapBindPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="ldapBindPassword"
              name="ldapBindPassword"
              required
              value={ldapPassword}
              onChange={(e) => setLdapPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder={useAutoDiscovery ? "Service account password" : "Enter password (leave empty to keep current)"}
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
            {useAutoDiscovery 
              ? "Service account password for binding to LDAP (encrypted at rest)"
              : "Password for the bind DN (encrypted at rest, leave empty to keep current)"}
          </p>
        </div>

        <div>
          <label htmlFor="ldapUserSearchFilter" className="block text-sm font-medium text-slate-700 mb-1">
            User Search Filter
          </label>
          <input
            type="text"
            id="ldapUserSearchFilter"
            name="ldapUserSearchFilter"
            defaultValue={config.ldapUserSearchFilter}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="(sAMAccountName={{username}})"
          />
          <p className="mt-1 text-xs text-slate-500">
            LDAP filter for finding users. Use {'{'}{'{'} username {'}'} {'}'} as placeholder
          </p>
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ For Active Directory, use: <code className="bg-amber-50 px-1 rounded">(sAMAccountName=&#123;&#123;username&#125;&#125;)</code>
          </p>
        </div>

        <div>
          <label htmlFor="ldapUsernameAttribute" className="block text-sm font-medium text-slate-700 mb-1">
            Username Attribute
          </label>
          <input
            type="text"
            id="ldapUsernameAttribute"
            name="ldapUsernameAttribute"
            defaultValue={config.ldapUsernameAttribute}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="sAMAccountName"
          />
          <p className="mt-1 text-xs text-slate-500">
            LDAP attribute containing the username
          </p>
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ For Active Directory, use: <code className="bg-amber-50 px-1 rounded">sAMAccountName</code> (not uid)
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Shield className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <input
              type="checkbox"
              id="ldapEnforced"
              name="ldapEnforced"
              value="true"
              defaultChecked={config.ldapEnforced}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <label htmlFor="ldapEnforced" className="text-sm font-medium text-slate-900">
              Enforce LDAP authentication
            </label>
            <p className="mt-1 text-xs text-slate-600">
              When enabled, only LDAP authentication is allowed (except for the bootstrap admin). Local users cannot log in.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
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
