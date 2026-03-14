# ajv ReDoS Mitigation (Dependency M1)

## Overview

This document records how `ajv` enters the dependency tree, verification that the effective version is safe for the ReDoS/$data CVE, and that application code does not use `ajv` or `$data` for untrusted schema validation.

## Dependency Chain

- **@eslint/eslintrc** (dev, via `eslint-config-next` / `eslint`): requires `ajv` ^6.12.4. Used for ESLint config schema validation only (build/lint time), not user input.
- **schema-utils** (dev, via webpack/Next.js): requires `ajv` ^6.12.5 and `ajv-keywords` ^3.5.2. Used for webpack loader/plugin option validation only (build time), not user input.

Application dependencies (e.g. `zod`, `react-hook-form`) do not use `ajv`; the app uses Zod for runtime validation.

## Effective ajv Version

- The hoisted **node_modules/ajv** is resolved to **6.14.0** in `package-lock.json` (>= 6.14.0 fixes the ReDoS issue with `$data`).
- An npm **override** in `package.json` forces `@eslint/eslintrc` to use `ajv@6.14.0` so that future installs cannot pull in 6.12.x.
- `schema-utils` is not overridden (it would also affect `schema-utils@4.x` used by webpack/terser, which depends on ajv 8.x); the lockfile already resolves the 6.x branch to 6.14.0.

## $data and Untrusted Schemas

- **Application code:** No use of `ajv`, `Ajv`, or `$data` in the codebase (no matches in `.ts`/`.tsx`/`.js`/`.jsx`).
- **Consumers of ajv:** ESLint and webpack use ajv only for **trusted** config/schema (ESLint config files, webpack options). No user-provided or external schemas are validated with ajv.
- **Conclusion:** The `$data` option is not used for untrusted schemas; no refactor required in app code.

## Validation-Related Tests

- The project uses **Zod** for API/form validation; there are no app-level tests that exercise ajv.
- Existing tests cover: `lib/auth.test.ts` (password verification), `lib/utils/export.test.ts` (PDF sanitization). These do not touch ajv.
- After any dependency upgrade, run `npm ls ajv` and `npm audit` to confirm no ajv &lt; 6.14.0 in the 6.x tree and that schema validation (e.g. `npm run build`, `npm run lint`) still passes.

## Safeguards in Place

1. **package.json overrides:** `"@eslint/eslintrc": { "ajv": "6.14.0" }` so ESLint’s ajv stays at 6.14.0.
2. **Lockfile:** Ensures hoisted `ajv` remains 6.14.0 for all 6.x consumers.
3. **CI:** `npm ci` and `npm audit --audit-level=high` in CI help detect regressions.

## References

- ReDoS fix in ajv 6.x: version >= 6.14.0.
- Audit finding: Dependency M1 (ajv ReDoS via `$data` option).
