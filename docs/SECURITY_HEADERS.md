# Security Headers and CSP

Security headers (including Content-Security-Policy) are built in `lib/security-headers.ts` and applied to every response in `middleware.ts`.

## Extending connect-src

To allow the app to send requests to additional origins (e.g. metrics, Sentry, analytics), use one of the following.

### Option 1: Environment variable (recommended for ops)

Set `CSP_CONNECT_SRC_EXTRA` to a comma-separated list of origins. Each value is added to the `connect-src` directive (in addition to `'self'`).

Examples:

- **Metrics / Prometheus (same origin):** If metrics are scraped from the same host, no change is needed; `'self'` already allows `/api/metrics`.
- **External metrics or error reporting:**
  ```bash
  CSP_CONNECT_SRC_EXTRA=https://sentry.io,https://ingest.us.sentry.io
  ```
- **Multiple endpoints:**
  ```bash
  CSP_CONNECT_SRC_EXTRA=https://api.example.com,https://cdn.example.com
  ```

Values are trimmed; empty entries are ignored. Do not include spaces inside a single origin.

### Option 2: Code / config object

For programmatic overrides (e.g. feature flags or build-time config), pass a partial `CspConfig` when calling `addSecurityHeaders`:

```ts
import { addSecurityHeaders } from "@/lib/security-headers";

addSecurityHeaders(response, {
  cspConfig: {
    connectSrc: ["'self'", "https://sentry.io", "https://ingest.us.sentry.io"],
  },
});
```

If you only need to add origins (not replace), use `getCspConfig()` and merge:

```ts
import { getCspConfig, addSecurityHeaders } from "@/lib/security-headers";

const config = getCspConfig();
addSecurityHeaders(response, {
  cspConfig: {
    connectSrc: [...config.connectSrc, "https://extra.example.com"],
  },
});
```

## Verifying CSP

1. Open DevTools → Network, reload a page, and inspect the response headers for `Content-Security-Policy`.
2. Or use DevTools → Console: CSP violations are reported when a blocked request occurs.
3. To test an new external endpoint: add it to `CSP_CONNECT_SRC_EXTRA`, restart the app, and confirm the request is no longer blocked (or that violations are visible if you intentionally omit it).

## Other headers

The same module sets:

- **Strict-Transport-Security** – enforce HTTPS
- **X-Frame-Options** – DENY
- **X-Content-Type-Options** – nosniff
- **Referrer-Policy** – strict-origin-when-cross-origin
- **Permissions-Policy** – camera, microphone, geolocation disabled
- **Cross-Origin-Opener-Policy** – same-origin

These are not currently configurable via env; change them in `lib/security-headers.ts` if needed.
