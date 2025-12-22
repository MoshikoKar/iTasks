'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Settings, Image, Globe, Users, Shield, FileText, AlertCircle, Mail } from 'lucide-react';
import { Checkbox } from './checkbox';
import { ErrorAlert } from './ui/error-alert';
import { TIMEZONE_OPTIONS, DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS, PASSWORD_POLICY_OPTIONS } from '@/lib/constants';

interface SystemConfig {
  // Branding & Reports
  orgLogo: string | null;
  reportFooterText: string | null;
  // Localization & Time
  timezone: string | null;
  dateFormat: string | null;
  timeFormat: string | null;
  // Collaboration & Content
  enableAttachments: boolean;
  maxAttachmentSizeMb: number | null;
  enableComments: boolean;
  enableMentions: boolean;
  // Security & Authentication
  sessionTimeoutHours: number | null;
  maxFailedLoginAttempts: number | null;
  lockUserAfterFailedLogins: boolean;
  passwordPolicyLevel: string | null;
  // Audit & Retention
  auditRetentionDays: number | null;
  // Variables
  supportEmail: string | null;
}

interface SystemConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Filter out emojis and unsupported characters for PDF export
 * Only allows ASCII printable characters (32-126) plus common extended ASCII (128-255)
 * This ensures compatibility with jsPDF and standard PDF fonts
 */
function filterSupportedCharacters(text: string): string {
  return text
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      // Allow ASCII printable (32-126) and extended ASCII (128-255)
      // Also allow common whitespace characters (tab, newline, etc.)
      return (code >= 32 && code <= 126) || (code >= 128 && code <= 255) || code === 9 || code === 10 || code === 13;
    })
    .join('');
}

export function SystemConfigForm({ onSuccess, onCancel }: SystemConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<SystemConfig>({
    // Branding & Reports
    orgLogo: null,
    reportFooterText: null,
    // Localization & Time
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    // Collaboration & Content
    enableAttachments: true,
    maxAttachmentSizeMb: 10,
    enableComments: true,
    enableMentions: true,
    // Security & Authentication
    sessionTimeoutHours: 24,
    maxFailedLoginAttempts: 5,
    lockUserAfterFailedLogins: true,
    passwordPolicyLevel: 'strong',
    // Audit & Retention
    auditRetentionDays: 365,
    // Variables
    supportEmail: null,
  });

  // Controlled state for form fields
  const [orgLogo, setOrgLogo] = useState('');
  const [reportFooterText, setReportFooterText] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('24h');
  const [enableAttachments, setEnableAttachments] = useState(true);
  const [maxAttachmentSizeMb, setMaxAttachmentSizeMb] = useState(10);
  const [enableComments, setEnableComments] = useState(true);
  const [enableMentions, setEnableMentions] = useState(true);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(24);
  const [maxFailedLoginAttempts, setMaxFailedLoginAttempts] = useState(5);
  const [lockUserAfterFailedLogins, setLockUserAfterFailedLogins] = useState(true);
  const [passwordPolicyLevel, setPasswordPolicyLevel] = useState('strong');
  const [auditRetentionDays, setAuditRetentionDays] = useState(365);
  const [supportEmail, setSupportEmail] = useState('');
  const [logoUploadType, setLogoUploadType] = useState<'url' | 'file' | 'none'>('url');

  useEffect(() => {
    fetch('/api/system-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConfig({
          orgLogo: data.orgLogo || null,
          reportFooterText: data.reportFooterText || null,
          timezone: data.timezone || 'UTC',
          dateFormat: data.dateFormat || 'DD/MM/YYYY',
          timeFormat: data.timeFormat || '24h',
          enableAttachments: data.enableAttachments ?? true,
          maxAttachmentSizeMb: data.maxAttachmentSizeMb ?? 10,
          enableComments: data.enableComments ?? true,
          enableMentions: data.enableMentions ?? true,
          sessionTimeoutHours: data.sessionTimeoutHours ?? 24,
          maxFailedLoginAttempts: data.maxFailedLoginAttempts ?? 5,
          lockUserAfterFailedLogins: data.lockUserAfterFailedLogins ?? true,
          passwordPolicyLevel: data.passwordPolicyLevel || 'strong',
          auditRetentionDays: data.auditRetentionDays ?? 365,
          supportEmail: data.supportEmail || null,
        });

        // Set controlled state variables
        const logoUrl = data.orgLogo || '';
        setOrgLogo(logoUrl);
        // If orgLogo is a relative path starting with /uploads/logos/, it's an uploaded file
        // If no logo, default to 'none'
        const isUploadedFile = logoUrl && logoUrl.startsWith('/uploads/logos/');
        const hasUrl = logoUrl && !logoUrl.startsWith('/uploads/logos/');
        setLogoUploadType(isUploadedFile ? 'file' : hasUrl ? 'url' : 'none');
        // Filter out emojis/unsupported chars from existing value
        // If null, undefined, or empty string, set to empty string (which will use default in PDF)
        const footerTextValue = data.reportFooterText && data.reportFooterText.trim() 
          ? filterSupportedCharacters(data.reportFooterText.trim()) 
          : '';
        setReportFooterText(footerTextValue);
        setTimezone(data.timezone || 'UTC');
        setDateFormat(data.dateFormat || 'DD/MM/YYYY');
        setTimeFormat(data.timeFormat || '24h');
        setEnableAttachments(data.enableAttachments ?? true);
        setMaxAttachmentSizeMb(data.maxAttachmentSizeMb ?? 10);
        setEnableComments(data.enableComments ?? true);
        setEnableMentions(data.enableMentions ?? true);
        setSessionTimeoutHours(data.sessionTimeoutHours ?? 24);
        setMaxFailedLoginAttempts(data.maxFailedLoginAttempts ?? 5);
        setLockUserAfterFailedLogins(data.lockUserAfterFailedLogins ?? true);
        setPasswordPolicyLevel(data.passwordPolicyLevel || 'strong');
        setAuditRetentionDays(data.auditRetentionDays ?? 365);
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

    // Validation
    if (enableAttachments && (!maxAttachmentSizeMb || maxAttachmentSizeMb <= 0)) {
      setError('Maximum attachment size must be greater than 0 when attachments are enabled');
      setIsLoading(false);
      return;
    }

    if (!enableComments && enableMentions) {
      setError('Mentions cannot be enabled when comments are disabled');
      setIsLoading(false);
      return;
    }

    // Check if we have a file upload
    const formData = new FormData(e.currentTarget);
    const logoFile = formData.get('orgLogoFile') as File | null;
    const useFileUpload = logoUploadType === 'file' && logoFile && logoFile.size > 0;

    let requestBody: any;
    let headers: Record<string, string>;

    if (useFileUpload) {
      // Use FormData for file upload
      const data = new FormData();

      // Add all the text fields - filter emojis before sending
      // Send empty string explicitly (backend will convert to null)
      const trimmedFooter = reportFooterText.trim();
      const filteredFooterText = trimmedFooter ? filterSupportedCharacters(trimmedFooter) : '';
      data.append('reportFooterText', filteredFooterText);
      data.append('timezone', timezone);
      data.append('dateFormat', dateFormat);
      data.append('timeFormat', timeFormat);
      data.append('enableAttachments', enableAttachments.toString());
      data.append('maxAttachmentSizeMb', enableAttachments ? maxAttachmentSizeMb.toString() : '');
      data.append('enableComments', enableComments.toString());
      data.append('enableMentions', (enableComments ? enableMentions : false).toString());
      data.append('sessionTimeoutHours', sessionTimeoutHours.toString());
      data.append('maxFailedLoginAttempts', maxFailedLoginAttempts.toString());
      data.append('lockUserAfterFailedLogins', lockUserAfterFailedLogins.toString());
      data.append('passwordPolicyLevel', passwordPolicyLevel);
      data.append('auditRetentionDays', auditRetentionDays.toString());
      // Send empty string explicitly (backend will convert to null)
      data.append('supportEmail', supportEmail.trim());

      // Add the logo file
      data.append('orgLogoFile', logoFile);

      requestBody = data;
      headers = {};
    } else {
      // Use JSON for URL-based logo or to preserve existing uploaded file
      // If in file mode but no new file selected, preserve the original uploaded file path
      let logoValue: string | null = orgLogo || null;
      if (logoUploadType === 'none') {
        // No logo selected
        logoValue = null;
      } else if (logoUploadType === 'file' && !logoFile) {
        // In file mode with no new file - preserve existing uploaded file if it exists
        logoValue = config.orgLogo && config.orgLogo.startsWith('/uploads/logos/')
          ? config.orgLogo
          : null;
      } else if (logoUploadType === 'url') {
        // In URL mode - use the URL value (but not blob URLs or uploaded file paths)
        if (orgLogo && !orgLogo.startsWith('blob:') && !orgLogo.startsWith('/uploads/logos/')) {
          logoValue = orgLogo;
        } else {
          logoValue = null;
        }
      }
      
      // Filter emojis from footer text before sending
      // If empty after trimming, send null explicitly
      const trimmedFooter = reportFooterText.trim();
      const filteredFooterText = trimmedFooter ? filterSupportedCharacters(trimmedFooter) : '';
      // If empty after trimming, send null explicitly
      const trimmedEmail = supportEmail.trim();
      
      requestBody = JSON.stringify({
        // Branding & Reports
        orgLogo: logoValue && logoValue.trim() ? logoValue.trim() : null,
        reportFooterText: filteredFooterText && filteredFooterText.length > 0 ? filteredFooterText : null,
        // Localization & Time
        timezone,
        dateFormat,
        timeFormat,
        // Collaboration & Content
        enableAttachments,
        maxAttachmentSizeMb: enableAttachments ? maxAttachmentSizeMb : null,
        enableComments,
        enableMentions: enableComments ? enableMentions : false,
        // Security & Authentication
        sessionTimeoutHours,
        maxFailedLoginAttempts,
        lockUserAfterFailedLogins,
        passwordPolicyLevel,
        // Audit & Retention
        auditRetentionDays,
        // Variables
        supportEmail: trimmedEmail && trimmedEmail.length > 0 ? trimmedEmail : null,
      });
      headers = { 'Content-Type': 'application/json' };
    }

    try {
      const response = await fetch('/api/system-config', {
        method: 'PATCH',
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update system configuration');
      }

      // Reload the form data to reflect the saved changes
      const reloadResponse = await fetch('/api/system-config');
      if (reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        // Update the form state with the reloaded data
        const footerTextValue = reloadData.reportFooterText && reloadData.reportFooterText.trim() 
          ? filterSupportedCharacters(reloadData.reportFooterText.trim()) 
          : '';
        setReportFooterText(footerTextValue);
        setConfig({
          ...config,
          reportFooterText: reloadData.reportFooterText || null,
        });
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <ErrorAlert message={error} onDismiss={() => setError('')} />
      )}

      {/* Branding & Reports Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Image size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Branding & Reports</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Organization Logo
            </label>

            {/* Logo upload type selector */}
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="logoUploadType"
                  value="none"
                  checked={logoUploadType === 'none'}
                  onChange={(e) => {
                    setLogoUploadType('none');
                    // Clear any existing logo when switching to none mode
                    if (orgLogo && orgLogo.startsWith('blob:')) {
                      URL.revokeObjectURL(orgLogo);
                    }
                    setOrgLogo('');
                  }}
                />
                <span className="text-sm text-foreground">No Logo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="logoUploadType"
                  value="url"
                  checked={logoUploadType === 'url'}
                  onChange={(e) => {
                    setLogoUploadType('url');
                    // Clear any file preview or uploaded file path when switching to URL mode
                    if (orgLogo) {
                      if (orgLogo.startsWith('blob:')) {
                        URL.revokeObjectURL(orgLogo);
                      }
                      // If it's an uploaded file path, clear it; otherwise keep the URL
                      if (orgLogo.startsWith('/uploads/logos/')) {
                        setOrgLogo('');
                      } else {
                        setOrgLogo(orgLogo);
                      }
                    }
                  }}
                />
                <span className="text-sm text-foreground">Use URL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="logoUploadType"
                  value="file"
                  checked={logoUploadType === 'file'}
                  onChange={(e) => {
                    setLogoUploadType('file');
                    // If switching to file mode and there's an existing uploaded file, restore it
                    if (config.orgLogo && config.orgLogo.startsWith('/uploads/logos/')) {
                      setOrgLogo(config.orgLogo);
                    } else if (orgLogo && !orgLogo.startsWith('blob:') && !orgLogo.startsWith('/uploads/logos/')) {
                      // If switching from URL mode with a URL value, clear it for file mode
                      setOrgLogo('');
                    }
                  }}
                />
                <span className="text-sm text-foreground">Upload File</span>
              </label>
            </div>

            {logoUploadType === 'none' ? (
              <p className="text-xs text-muted-foreground">
                No logo will be displayed. The default iTasks branding will be used.
              </p>
            ) : logoUploadType === 'url' ? (
              <>
                <input
                  type="text"
                  id="orgLogo"
                  name="orgLogo"
                  value={orgLogo && !orgLogo.startsWith('/uploads/logos/') ? orgLogo : ''}
                  onChange={(e) => setOrgLogo(e.target.value)}
                  className="input-base"
                  placeholder="https://example.com/logo.png"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  URL to your organization's logo (PNG/SVG). Leave empty to use default branding.
                </p>
              </>
            ) : (
              <>
                {orgLogo && orgLogo.startsWith('/uploads/logos/') && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Current file: {orgLogo.split('/').pop()}
                  </p>
                )}
                <input
                  type="file"
                  id="orgLogoFile"
                  name="orgLogoFile"
                  accept="image/png,image/svg+xml,image/jpeg,image/gif"
                  className="input-base"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Basic file validation
                      if (file.size > 5 * 1024 * 1024) { // 5MB limit
                        setError('Logo file must be less than 5MB');
                        return;
                      }
                      // Create a temporary URL for preview
                      const tempUrl = URL.createObjectURL(file);
                      setOrgLogo(tempUrl);
                    }
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload your organization's logo (PNG, SVG, JPEG, GIF - max 5MB). Leave empty to use default branding.
                </p>
              </>
            )}

            {orgLogo && logoUploadType !== 'none' && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <img
                  src={orgLogo}
                  alt="Organization logo preview"
                  className="max-h-12 max-w-32 object-contain border border-border rounded p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reportFooterText" className="block text-xs font-medium text-foreground mb-1">
              Report Footer Text
            </label>
            <textarea
              id="reportFooterText"
              name="reportFooterText"
              value={reportFooterText || ''}
              onChange={(e) => {
                // Filter out emojis and unsupported characters as user types
                const filtered = filterSupportedCharacters(e.target.value);
                setReportFooterText(filtered);
              }}
              className="input-base"
              rows={3}
              placeholder="Made with <3 with iTasks"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Custom footer text for reports and exports. Leave empty to use default: "Made with &lt;3 with iTasks". Emojis and unsupported characters are automatically removed.
            </p>
          </div>
        </div>
      </section>

      {/* Localization & Time Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Globe size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Localization & Time</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="timezone" className="block text-xs font-medium text-foreground mb-1">
              Timezone <span className="text-destructive">*</span>
            </label>
            <select
              id="timezone"
              name="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input-base"
              required
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dateFormat" className="block text-xs font-medium text-foreground mb-1">
              Date Format <span className="text-destructive">*</span>
            </label>
            <select
              id="dateFormat"
              name="dateFormat"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="input-base"
              required
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="timeFormat" className="block text-xs font-medium text-foreground mb-1">
              Time Format <span className="text-destructive">*</span>
            </label>
            <select
              id="timeFormat"
              name="timeFormat"
              value={timeFormat}
              onChange={(e) => setTimeFormat(e.target.value)}
              className="input-base"
              required
            >
              {TIME_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Collaboration & Content Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Users size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Collaboration & Content</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label htmlFor="enableAttachments" className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                id="enableAttachments"
                name="enableAttachments"
                checked={enableAttachments}
                onChange={(e) => setEnableAttachments(e.target.checked)}
              />
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                Enable File Attachments
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="maxAttachmentSizeMb" className="block text-xs font-medium text-foreground mb-1">
              Maximum Attachment Size (MB) {enableAttachments && <span className="text-destructive">*</span>}
            </label>
            <input
              type="number"
              id="maxAttachmentSizeMb"
              name="maxAttachmentSizeMb"
              min="1"
              max="100"
              value={maxAttachmentSizeMb}
              onChange={(e) => setMaxAttachmentSizeMb(parseInt(e.target.value, 10) || 10)}
              className="input-base"
              disabled={!enableAttachments}
              required={enableAttachments}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Maximum file size for attachments in megabytes. Must be greater than 0 when attachments are enabled.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="enableComments" className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                id="enableComments"
                name="enableComments"
                checked={enableComments}
                onChange={(e) => {
                  setEnableComments(e.target.checked);
                  if (!e.target.checked) {
                    setEnableMentions(false);
                  }
                }}
              />
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                Enable Comments
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="enableMentions" className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                id="enableMentions"
                name="enableMentions"
                checked={enableMentions && enableComments}
                onChange={(e) => setEnableMentions(e.target.checked)}
                disabled={!enableComments}
              />
              <span className={`text-sm font-medium whitespace-nowrap ${!enableComments ? 'text-muted-foreground' : 'text-foreground'}`}>
                Enable @Mentions in Comments
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Security & Authentication Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Shield size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Security & Authentication</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sessionTimeoutHours" className="block text-xs font-medium text-foreground mb-1">
              Session Timeout (hours) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              id="sessionTimeoutHours"
              name="sessionTimeoutHours"
              min="1"
              max="168"
              value={sessionTimeoutHours}
              onChange={(e) => setSessionTimeoutHours(parseInt(e.target.value, 10) || 24)}
              className="input-base"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              How long before inactive sessions expire (1-168 hours).
            </p>
          </div>

          <div>
            <label htmlFor="maxFailedLoginAttempts" className="block text-xs font-medium text-foreground mb-1">
              Max Failed Login Attempts <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              id="maxFailedLoginAttempts"
              name="maxFailedLoginAttempts"
              min="1"
              max="10"
              value={maxFailedLoginAttempts}
              onChange={(e) => setMaxFailedLoginAttempts(parseInt(e.target.value, 10) || 5)}
              className="input-base"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Number of failed login attempts before account lockout.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="lockUserAfterFailedLogins" className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              id="lockUserAfterFailedLogins"
              name="lockUserAfterFailedLogins"
              checked={lockUserAfterFailedLogins}
              onChange={(e) => setLockUserAfterFailedLogins(e.target.checked)}
            />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              Lock user accounts after failed login attempts
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="passwordPolicyLevel" className="block text-xs font-medium text-foreground mb-1">
            Password Policy Level <span className="text-destructive">*</span>
          </label>
          <select
            id="passwordPolicyLevel"
            name="passwordPolicyLevel"
            value={passwordPolicyLevel}
            onChange={(e) => setPasswordPolicyLevel(e.target.value)}
            className="input-base"
            required
          >
            {PASSWORD_POLICY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Password complexity requirements for user accounts.
          </p>
        </div>
      </section>

      {/* Audit & Retention Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <FileText size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Audit & Retention</h3>
        </div>

        <div>
          <label htmlFor="auditRetentionDays" className="block text-xs font-medium text-foreground mb-1">
            Audit Log Retention (days) <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            id="auditRetentionDays"
            name="auditRetentionDays"
            min="30"
            max="3650"
            value={auditRetentionDays}
            onChange={(e) => setAuditRetentionDays(parseInt(e.target.value, 10) || 365)}
            className="input-base"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            How long to keep audit logs and system logs (30-3650 days). Used for cleanup and archiving.
          </p>
        </div>
      </section>

      {/* Variables Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Mail size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Variables</h3>
        </div>

        <div>
          <label htmlFor="supportEmail" className="block text-xs font-medium text-foreground mb-1">
            Support Email Address
          </label>
          <input
            type="email"
            id="supportEmail"
            name="supportEmail"
            value={supportEmail || ''}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="input-base"
            placeholder="support@example.com"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            This email will be used for contact form submissions and displayed in the footer.
          </p>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={isLoading}>
          Save System Configuration
        </Button>
      </div>
    </form>
  );
}