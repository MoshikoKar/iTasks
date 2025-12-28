import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getCSRFCookieOptions, getCookieOptions } from './constants';

const CSRF_TOKEN_COOKIE = 'csrf_token';
const CSRF_SECRET_COOKIE = 'csrf_secret';

/**
 * Generate a CSRF token pair (token + secret)
 */
export function generateCSRFToken(): { token: string; secret: string } {
  const secret = crypto.randomBytes(32).toString('hex');
  const token = crypto.createHash('sha256').update(secret).digest('hex');
  return { token, secret };
}

/**
 * Set CSRF token cookies for the current request
 */
export async function setCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const { token, secret } = generateCSRFToken();

  // Set the token (what client sees) - uses getCSRFCookieOptions for consistent settings
  cookieStore.set(CSRF_TOKEN_COOKIE, token, {
    ...getCSRFCookieOptions(),
    maxAge: 60 * 60, // 1 hour
  });

  // Set the secret (server validation) - uses getCookieOptions (httpOnly: true)
  cookieStore.set(CSRF_SECRET_COOKIE, secret, {
    ...getCookieOptions(),
    maxAge: 60 * 60, // 1 hour
  });

  return token;
}

/**
 * Get the current CSRF token for forms
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_COOKIE)?.value || null;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(requestToken: string): Promise<boolean> {
  const cookieStore = await cookies();
  const secret = cookieStore.get(CSRF_SECRET_COOKIE)?.value;

  if (!secret) {
    return false;
  }

  // Hash the provided token and compare with secret
  const expectedToken = crypto.createHash('sha256').update(secret).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(requestToken, 'hex'),
    Buffer.from(expectedToken, 'hex')
  );
}

/**
 * Validate CSRF token from headers (middleware-safe version)
 * This checks headers only and doesn't consume the request body
 */
export async function validateCSRFHeader(request: Request): Promise<boolean> {
  // Only validate state-changing methods
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!stateChangingMethods.includes(request.method)) {
    return true; // Allow non-state-changing requests
  }

  // Skip validation for auth endpoints that need to be accessible
  const authPaths = ['/api/auth/login', '/api/auth/logout', '/api/csrf'];
  const url = new URL(request.url);
  if (authPaths.some(path => url.pathname.startsWith(path))) {
    return true;
  }

  // Check CSRF token from header (preferred method)
  const requestToken = request.headers.get('x-csrf-token');
  if (!requestToken) {
    return false;
  }

  return await validateCSRFToken(requestToken);
}

/**
 * Validate CSRF token from request body (for routes that need body validation)
 * This should be called from individual route handlers, not middleware
 */
export async function validateCSRFBody(request: Request): Promise<boolean> {
  // First check header
  if (await validateCSRFHeader(request)) {
    return true;
  }

  // If no header token, try to extract from body
  // This consumes the request body, so it should be used carefully
  let requestToken: string | null = null;

  try {
    // Try form data first
    const formData = await request.formData();
    requestToken = formData.get('csrf_token') as string;
  } catch {
    try {
      // Try JSON body
      const body = await request.json();
      requestToken = body.csrf_token || body.csrfToken;
    } catch {
      // Neither form data nor JSON
    }
  }

  if (!requestToken) {
    return false;
  }

  return await validateCSRFToken(requestToken);
}