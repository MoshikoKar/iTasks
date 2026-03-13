# XML Parsing and fast-xml-parser Dependency

## Overview

This document describes how XML parsing enters the dependency tree, which packages depend on it, and what safeguards are in place for the fast-xml-parser CVE chain (path traversal, entity encoding bypass, DoS).

## Dependency Chain

The vulnerable `fast-xml-parser` (versions &lt;5.3.9) is pulled in **transitively** via the AWS SDK XML stack:

- **Direct path from this project:**  
  `@types/nodemailer` (devDependency) → `@aws-sdk/client-sesv2` → `@aws-sdk/core` → `@aws-sdk/xml-builder` → `fast-xml-parser`

- **Why:** `@types/nodemailer` declares a dependency on `@aws-sdk/client-sesv2` for TypeScript typings when using Nodemailer with AWS SES. The app uses `nodemailer` for SMTP (see `lib/smtp.ts`); the types package is the only direct link to the AWS SDK in the lock file.

- **Remotion / @upstash/ratelimit:**  
  `@upstash/ratelimit` does not list AWS SDK in its dependencies in the current lock file. `@remotion/cli` and `remotion` are devDependencies only; they do not affect production runtime. The only production-relevant transitive path to `fast-xml-parser` is via `@types/nodemailer` (dev), but the lock file is shared, so the vulnerable package is still present unless overridden.

## XML Parsing Usage in This App

- **Application code does not parse XML.** No direct use of `fast-xml-parser`, `@aws-sdk/xml-builder`, or other XML libraries in app or API routes.
- **AWS SDK** is only present as a transitive dependency of `@types/nodemailer`. The app does not call AWS SES or any AWS API; mail is sent via SMTP (e.g. Nodemailer transport), not SES.
- **Risk:** The vulnerable code path is only reachable if some dependency (e.g. AWS SDK) parses **untrusted** XML. Since the app does not use AWS SDK or XML parsing in its own logic, the main residual risk is in dev/install (e.g. if a script or tool invoked XML parsing on untrusted input). Keeping the transitive dependency patched is still required for security hygiene and audit compliance.

## Safeguards in Place

1. **npm `overrides` (package.json)**  
   The root `package.json` includes:

   ```json
   "overrides": {
     "fast-xml-parser": "^5.3.9"
   }
   ```

   This forces every dependency of the project (including `@aws-sdk/xml-builder`) to resolve `fast-xml-parser` to a version ≥5.3.9, which includes fixes for the critical entity encoding bypass and related CVEs.

2. **No untrusted XML in app**  
   No user or external XML is parsed by application code. No XML parsing API is exposed to clients.

3. **Upgrade path**  
   When `@types/nodemailer` or the AWS SDK stack move to versions that depend on `fast-xml-parser` ≥5.3.9 by default, the override can be revisited or removed. Periodically run `npm audit` and check for advisories on `fast-xml-parser` and `@aws-sdk/xml-builder`.

## Maintenance

- After any `npm install` or dependency change, run `npm audit` and confirm no critical/high findings for `fast-xml-parser` or `@aws-sdk/xml-builder`.
- If the project adds direct use of AWS SDK or XML parsing, reassess:
  - Use only trusted/sanitized XML inputs.
  - Prefer libraries that depend on `fast-xml-parser` ≥5.3.9 (or equivalent patched parser).
  - Keep the override until all transitive paths use a patched version.

---

*Last updated: 2026-03-13. Reflects dependency state and overrides as of that date.*
