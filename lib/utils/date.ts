/**
 * Centralized date formatting utilities
 * All date formatting should use these functions for consistency
 */

/**
 * Format date and time in a user-friendly format
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date-time string (dd/MM/yyyy HH:mm:ss AM/PM) or "Not set" if null
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Jerusalem",
  });
  
  const parts = formatter.formatToParts(d);
  const day = parts.find(p => p.type === "day")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const year = parts.find(p => p.type === "year")?.value;
  const hour = parts.find(p => p.type === "hour")?.value;
  const minute = parts.find(p => p.type === "minute")?.value;
  const second = parts.find(p => p.type === "second")?.value;
  const dayPeriod = parts.find(p => p.type === "dayPeriod")?.value;
  
  return `${day}/${month}/${year} ${hour}:${minute}:${second} ${dayPeriod}`;
}

/**
 * Format date only (no time)
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string (dd/MM/yyyy) or "Not set" if null
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
  
  const parts = formatter.formatToParts(d);
  const day = parts.find(p => p.type === "day")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const year = parts.find(p => p.type === "year")?.value;
  
  return `${day}/${month}/${year}`;
}

/**
 * Format time only (no date)
 * @param date - Date object, string, or null/undefined
 * @returns Formatted time string or "Not set" if null
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid time";
  
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Jerusalem",
  });
}

/**
 * Format date for datetime-local input (ISO format without timezone)
 * @param date - Date object, string, or null/undefined
 * @returns ISO format string (YYYY-MM-DDTHH:mm) or empty string if null
 */
export function formatDateTimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return d.toISOString().slice(0, 16);
}

/**
 * Format date for display in tables (stable, timezone-aware)
 * @param date - Date object or string
 * @returns Formatted string (dd/MM/yyyy HH:mm) in Jerusalem timezone
 */
export function formatDateTimeStable(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";
  
  // Format in Jerusalem timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jerusalem",
  });
  
  const parts = formatter.formatToParts(d);
  const day = parts.find(p => p.type === "day")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const year = parts.find(p => p.type === "year")?.value;
  const hour = parts.find(p => p.type === "hour")?.value;
  const minute = parts.find(p => p.type === "minute")?.value;
  
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date object, string, or null/undefined
 * @returns Relative time string or "Not set" if null
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  
  return formatDate(d);
}

/**
 * Check if a date is overdue
 * @param date - Date object, string, or null/undefined
 * @returns true if date is in the past
 */
export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;
  
  return d.getTime() < Date.now();
}

/**
 * Parse date string to Date object safely
 * @param date - Date string or Date object
 * @returns Date object or null if invalid
 */
export function parseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  
  return d;
}
