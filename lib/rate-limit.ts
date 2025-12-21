/**
 * Simple in-memory rate limiter
 * For production, consider upgrading to Redis-based rate limiting (@upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private windowMs: number = 15 * 60 * 1000, private maxRequests: number = 100) { // 15 minutes, 100 requests
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime: now + this.windowMs };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Rate limiters for different endpoints
export const authRateLimiter = new MemoryRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes for auth
export const apiRateLimiter = new MemoryRateLimiter(60 * 1000, 100); // 100 requests per minute for general API
export const uploadRateLimiter = new MemoryRateLimiter(60 * 1000, 10); // 10 uploads per minute

/**
 * Get client IP address from request
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  // Use the first IP from x-forwarded-for if available
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || clientIP || 'unknown';
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function withRateLimit(
  handler: (request: Request, ...args: any[]) => Promise<Response> | Response,
  limiter: MemoryRateLimiter,
  identifierFn?: (request: Request) => string
) {
  return async (request: Request, ...args: any[]) => {
    const identifier = identifierFn ? identifierFn(request) : getClientIP(request);
    const result = limiter.check(identifier);

    if (!result.allowed) {
      return new Response(JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      });
    }

    // Add rate limit headers to successful responses
    const response = await handler(request, ...args);

    if (response instanceof Response) {
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      newResponse.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      return newResponse;
    }

    return response;
  };
}