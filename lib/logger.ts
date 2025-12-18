/**
 * Secure logger utility that sanitizes sensitive data before logging
 * Prevents exposure of passwords, tokens, emails, and other PII in logs
 */

// Fields that should be redacted from logs
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'smtpPassword',
  'ldapBindPassword',
  'email', // Can be redacted in some contexts, but we'll be selective
];

/**
 * Recursively sanitize an object by redacting sensitive fields
 */
function sanitizeObject(obj: any, depth = 0, maxDepth = 10): any {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return '[MAX_DEPTH_REACHED]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1, maxDepth));
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : obj.stack,
    };
  }

  // Handle objects
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this field should be redacted
    const shouldRedact = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (shouldRedact) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeObject(value, depth + 1, maxDepth);
    }
  }

  return sanitized;
}

/**
 * Extract error message safely without exposing sensitive data
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    const sanitized = sanitizeObject(error);
    return JSON.stringify(sanitized);
  }
  return String(error);
}

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Secure logger that sanitizes sensitive data
 */
class SecureLogger {
  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors and warnings
    if (process.env.NODE_ENV === 'production') {
      return level === LogLevel.ERROR || level === LogLevel.WARN;
    }
    // In development, log everything
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    if (data !== undefined) {
      const sanitized = sanitizeObject(data);
      return `[${timestamp}] [${levelStr}] ${message} ${JSON.stringify(sanitized, null, 2)}`;
    }
    
    return `[${timestamp}] [${levelStr}] ${message}`;
  }

  error(message: string, error?: unknown, data?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const sanitizedError = error ? extractErrorMessage(error) : undefined;
    const sanitizedData = data ? sanitizeObject(data) : undefined;

    if (sanitizedError && sanitizedData) {
      console.error(this.formatMessage(LogLevel.ERROR, message, { error: sanitizedError, ...sanitizedData }));
    } else if (sanitizedError) {
      console.error(this.formatMessage(LogLevel.ERROR, message, { error: sanitizedError }));
    } else if (sanitizedData) {
      console.error(this.formatMessage(LogLevel.ERROR, message, sanitizedData));
    } else {
      console.error(this.formatMessage(LogLevel.ERROR, message));
    }
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.log(this.formatMessage(LogLevel.DEBUG, message, data));
  }
}

// Export singleton instance
export const logger = new SecureLogger();

// Export sanitize function for use in other contexts
export { sanitizeObject, extractErrorMessage };
