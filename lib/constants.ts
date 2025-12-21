export const SESSION_COOKIE = "it_session";

// Timezone options (common IANA timezones)
export const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },

  // North America
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "America/Mexico_City", label: "Mexico City (CST/CDT)" },

  // Europe
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Europe/Bucharest", label: "Bucharest (Romania, EET/EEST)" },
  { value: "Europe/Warsaw", label: "Warsaw (CET/CEST)" },

  // Middle East & Africa
  { value: "Asia/Jerusalem", label: "Jerusalem (IST/IDT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Africa/Cairo", label: "Cairo (EET/EEST)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },

  // Asia
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },

  // Oceania
  { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEDT/AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT/NZST)" },

  // South America
  { value: "America/Sao_Paulo", label: "São Paulo (BRT/BRST)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (ART/ARST)" },
];

// Date format options
export const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2023)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2023)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2023-12-31)" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY (31-12-2023)" },
  { value: "MM-DD-YYYY", label: "MM-DD-YYYY (12-31-2023)" },
];

// Time format options
export const TIME_FORMAT_OPTIONS = [
  { value: "24h", label: "24-hour (14:30)" },
  { value: "12h", label: "12-hour (2:30 PM)" },
];

// Password policy levels
export const PASSWORD_POLICY_OPTIONS = [
  { value: "basic", label: "Basic (8+ characters)" },
  { value: "strong", label: "Strong (8+ chars, mixed case, numbers)" },
  { value: "enterprise", label: "Enterprise (12+ chars, special chars, etc.)" },
];

// Password policy configuration
export const PASSWORD_POLICY_CONFIG: Record<string, { minLength: number; hint: string }> = {
  basic: {
    minLength: 8,
    hint: 'Minimum 8 characters',
  },
  strong: {
    minLength: 8,
    hint: 'Minimum 8 characters, mixed case, and numbers',
  },
  enterprise: {
    minLength: 12,
    hint: 'Minimum 12 characters, mixed case, numbers, and special characters',
  },
};

// Get password policy hint text based on policy level
export function getPasswordPolicyHint(policyLevel: string = 'strong'): string {
  return PASSWORD_POLICY_CONFIG[policyLevel]?.hint || PASSWORD_POLICY_CONFIG.strong.hint;
}

// Get minimum password length based on policy level
export function getPasswordMinLength(policyLevel: string = 'strong'): number {
  return PASSWORD_POLICY_CONFIG[policyLevel]?.minLength || PASSWORD_POLICY_CONFIG.strong.minLength;
}

// Password validation functions
export function validatePassword(password: string, policyLevel: string = 'strong'): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (policyLevel) {
    case 'enterprise':
      if (password.length < 12) {
        errors.push('Password must be at least 12 characters long');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }
      break;

    case 'strong':
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
        errors.push('Password must contain both uppercase and lowercase letters');
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      break;

    case 'basic':
    default:
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
