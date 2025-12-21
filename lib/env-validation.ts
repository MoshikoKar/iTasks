/**
 * Environment variable validation for startup
 */

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all required environment variables on startup
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'NEXTAUTH_SECRET',
  ];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      errors.push(`Required environment variable ${varName} is missing`);
    }
  }

  // Validate DATABASE_URL format (basic check)
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Validate ENCRYPTION_KEY length
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters long for AES-256 security');
  }

  // Validate NEXTAUTH_SECRET length
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret.length < 32) {
    warnings.push('NEXTAUTH_SECRET should be at least 32 characters long for security');
  }

  // Check for development vs production environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    // Production-specific validations
    if (!process.env.NEXTAUTH_URL) {
      errors.push('NEXTAUTH_URL is required in production');
    }

    // Check for hardcoded secrets in production
    if (databaseUrl?.includes('localhost') || databaseUrl?.includes('127.0.0.1')) {
      warnings.push('DATABASE_URL appears to be using localhost in production environment');
    }

    // Check for development ports in production
    if (process.env.PORT && parseInt(process.env.PORT) < 1024 && parseInt(process.env.PORT) !== 80 && parseInt(process.env.PORT) !== 443) {
      warnings.push('Using privileged port in production may require special permissions');
    }
  }

  // Check for common security issues
  if (encryptionKey === 'a9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0') {
    errors.push('ENCRYPTION_KEY is using the default/example value - change this immediately');
  }

  if (nextAuthSecret === 'your-secret-key-here') {
    errors.push('NEXTAUTH_SECRET is using the default/example value - change this immediately');
  }

  // Check for SMTP configuration if provided
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    const smtpPort = process.env.SMTP_PORT;
    if (smtpPort && (isNaN(parseInt(smtpPort)) || parseInt(smtpPort) <= 0 || parseInt(smtpPort) > 65535)) {
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
 * Validate environment and exit if invalid (for use in scripts)
 */
export function validateEnvironmentOrExit(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:');
    result.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  if (!result.isValid) {
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => console.error(`   - ${error}`));
    console.error('\nPlease fix the above issues before starting the application.');
    process.exit(1);
  }

  if (result.warnings.length === 0) {
    console.log('✅ Environment validation passed');
  } else {
    console.log('✅ Environment validation passed (with warnings)');
  }
}