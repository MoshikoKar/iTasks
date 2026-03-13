/**
 * Security headers utility: builds CSP and applies standard security headers.
 * CSP connect-src can be extended via env (CSP_CONNECT_SRC_EXTRA) or via config.
 * See docs/SECURITY_HEADERS.md for how to add metrics, Sentry, or other endpoints.
 */

import { NextResponse } from "next/server";

/** Configuration for Content-Security-Policy directives. */
export interface CspConfig {
  /** Allowed origins for fetch/XHR/WebSocket (connect-src). Always includes 'self'. */
  connectSrc: string[];
  /** default-src (default: ['self']) */
  defaultSrc: string[];
  /** script-src (default includes 'self' and dev-only unsafe-inline/unsafe-eval when applicable) */
  scriptSrc: string[];
  /** style-src (default: ['self', 'unsafe-inline']) */
  styleSrc: string[];
  /** img-src (default: ['self', 'data:', 'https:']) */
  imgSrc: string[];
  /** font-src (default: ['self']) */
  fontSrc: string[];
  /** media-src (default: ['none']) */
  mediaSrc: string[];
  /** object-src (default: ['none']) */
  objectSrc: string[];
  /** frame-ancestors (default: ['none']) */
  frameAncestors: string[];
  /** base-uri (default: ['self']) */
  baseUri: string[];
  /** form-action (default: ['self']) */
  formAction: string[];
}

const DEFAULT_CSP: CspConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  fontSrc: ["'self'"],
  mediaSrc: ["'none'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  connectSrc: ["'self'"],
};

/**
 * Parse CSP_CONNECT_SRC_EXTRA from env (comma-separated list of origins).
 * Values are trimmed; empty entries are ignored.
 */
function getConnectSrcExtraFromEnv(): string[] {
  const raw = process.env.CSP_CONNECT_SRC_EXTRA;
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build effective CSP config: defaults + env extra connect-src + optional overrides.
 */
export function getCspConfig(overrides?: Partial<CspConfig>): CspConfig {
  const extra = getConnectSrcExtraFromEnv();
  const base: CspConfig = {
    ...DEFAULT_CSP,
    connectSrc: [...DEFAULT_CSP.connectSrc, ...extra],
  };
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    connectSrc: overrides.connectSrc ?? [...base.connectSrc],
  };
}

/**
 * Build the Content-Security-Policy header value from config.
 */
export function buildContentSecurityPolicy(config?: Partial<CspConfig>): string {
  const c = getCspConfig(config);
  const dir = (key: keyof CspConfig, values: string[]) =>
    `${key.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "")}-src ${values.join(" ")}`;
  return [
    `default-src ${c.defaultSrc.join(" ")}`,
    `script-src ${c.scriptSrc.join(" ")}`,
    `style-src ${c.styleSrc.join(" ")}`,
    `img-src ${c.imgSrc.join(" ")}`,
    `font-src ${c.fontSrc.join(" ")}`,
    `connect-src ${c.connectSrc.join(" ")}`,
    `media-src ${c.mediaSrc.join(" ")}`,
    `object-src ${c.objectSrc.join(" ")}`,
    `frame-ancestors ${c.frameAncestors.join(" ")}`,
    `base-uri ${c.baseUri.join(" ")}`,
    `form-action ${c.formAction.join(" ")}`,
  ].join("; ");
}

export interface SecurityHeadersOptions {
  /** Optional CSP overrides (e.g. extra connect-src). Merged with env-based config. */
  cspConfig?: Partial<CspConfig>;
}

/**
 * Add security headers to a NextResponse (CSP, HSTS, X-Frame-Options, etc.).
 * Call this from middleware for every response.
 */
export function addSecurityHeaders(
  response: NextResponse,
  options?: SecurityHeadersOptions
): void {
  const csp = buildContentSecurityPolicy(options?.cspConfig);
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
}
