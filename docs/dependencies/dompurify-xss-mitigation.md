# dompurify XSS Mitigation (Dependency M2)

## Overview

This document records how `dompurify` enters the dependency tree, verification that the effective version is safe for the XSS vulnerability (CVE-2026-0540), and that the application does not directly use DOMPurify or pass user HTML through it.

## Vulnerability

- **CVE-2026-0540:** DOMPurify 3.1.3 through 3.3.1 (and 2.5.3–2.5.8) contain an XSS bypass due to missing rawtext elements in the SAFE_FOR_XML regex. Patched in 3.3.2+ (3.x) and 2.5.9+ (2.x).

## Dependency Chain

- **jspdf** (direct dependency): lists `dompurify` in **optionalDependencies** as `^3.3.1`. jsPDF uses it when rendering HTML into PDF via its `html()` API.
- The application does **not** import or use `DOMPurify` anywhere in the codebase.
- PDF export in `lib/utils/export.ts` uses **text extraction** from the DOM plus `filterSupportedCharacters()` and `pdf.text()` only; it does **not** use jsPDF’s `html()` or any path that would pass user HTML through DOMPurify.

## Effective dompurify Version

- `package-lock.json` resolves **dompurify** to **3.3.3** (>= 3.3.2, patched).
- An npm **override** in `package.json` pins `dompurify` to `^3.3.2` so future installs cannot pull a vulnerable version.

## Flows That Sanitize/Render User HTML

- **None.** There is no flow in the app that sanitizes or renders user-provided HTML with DOMPurify. The only HTML sanitization–related logic is:
  - **PDF export:** Uses `extractTextContent()` and `filterSupportedCharacters()`; no raw HTML is passed to jsPDF or DOMPurify.
  - **Logger:** `sanitizeObject` redacts sensitive fields for logging; not HTML sanitization.

## Verification

- Search codebase for `DOMPurify` / `dompurify`: no direct imports.
- After dependency changes, run `npm ls dompurify` and `npm audit` to confirm no vulnerable dompurify in the tree.
- If jsPDF’s `html()` is ever used in the future, ensure only trusted or pre-sanitized HTML is passed and that dompurify remains >= 3.3.2 via the override.
