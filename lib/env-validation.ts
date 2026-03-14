/**
 * Environment variable validation for startup.
 * The app uses a custom DB-backed session model (SESSION_COOKIE); NextAuth is optional and gated by USE_NEXTAUTH.
 */

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const USE_NEXTAUTH = process.env.USE_NEXTAUTH === 'true' || process.env.USE_NEXTAUTH === '1';

/**
 * Validate all required environment variables on startup
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Always required (core stack)
  const requiredVars: string[] = ['DATABASE_URL', 'ENCRYPTION_KEY'];

  if (USE_NEXTAUTH) {
    requiredVars.push('NEXTAUTH_SECRET');
  }

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      errors.push(`Required environment variable ${varName} is missing`);
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long for AES-256 security');
  }

  if (USE_NEXTAUTH) {
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (nextAuthSecret && nextAuthSecret.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters long for security');
    }
    if (nextAuthSecret === 'your-secret-key-here') {
      errors.push('NEXTAUTH_SECRET is using the default/example value - change this immediately');
    }
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    if (USE_NEXTAUTH && !process.env.NEXTAUTH_URL) {
      errors.push('NEXTAUTH_URL is required in production when USE_NEXTAUTH is set');
    }
    const hasBaseUrl = !!(process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim());
    if (!hasBaseUrl) {
      errors.push(
        'Set NEXT_PUBLIC_APP_URL or NEXTAUTH_URL in production so the app can build absolute URLs (e.g. in notification emails). Session is handled via SESSION_COOKIE.'
      );
    }

    if (databaseUrl?.includes('localhost') || databaseUrl?.includes('127.0.0.1')) {
      warnings.push('DATABASE_URL appears to be using localhost in production environment');
    }

    if (process.env.PORT && parseInt(process.env.PORT, 10) < 1024 && parseInt(process.env.PORT, 10) !== 80 && parseInt(process.env.PORT, 10) !== 443) {
      warnings.push('Using privileged port in production may require special permissions');
    }
  }

  if (encryptionKey === 'a9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0') {
    errors.push('ENCRYPTION_KEY is using the default/example value - change this immediately');
  }

  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    const smtpPort = process.env.SMTP_PORT;
    if (smtpPort && (isNaN(parseInt(smtpPort, 10)) || parseInt(smtpPort, 10) <= 0 || parseInt(smtpPort, 10) > 65535)) {
      errors.push('SMTP_PORT must be a valid port number (1-65535)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment and exit if invalid (for use in scripts).
 * Uses ASCII-safe prefixes for log aggregation.
 */
export function validateEnvironmentOrExit(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    console.warn('[WARN] Environment validation warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (!result.isValid) {
    console.error('[ERROR] Environment validation failed:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nPlease fix the above issues before starting the application.');
    process.exit(1);
  }

  if (result.warnings.length === 0) {
    console.log('[OK] Environment validation passed');
  } else {
    console.log('[OK] Environment validation passed (with warnings)');
  }
}