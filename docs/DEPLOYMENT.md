# Deployment and Lockfile Strategy

## Overview

This project is designed to be deployed to a Node.js environment (self-hosted or containerized) using `next start` for production.

Production builds and CI runs must always install dependencies from the committed `package-lock.json` to ensure deterministic installs.

## CI Pipeline (GitHub Actions)

A GitHub Actions workflow at `.github/workflows/ci.yml` implements the baseline CI pipeline:

- Checks out the repository.
- Sets up Node.js with npm caching.
- Runs `npm ci` to install dependencies strictly from `package-lock.json`.
- Runs `npm run lint`.
- Runs `npm run build`.

Because `npm ci` is used, the workflow will fail if `package-lock.json` is out of sync with `package.json`, providing automatic lockfile validation.

## Recommended Production Build Commands

For production builds (locally, in containers, or other CI systems), use:

```powershell
npm ci
npm run build
npm start
```

- `npm ci` installs dependencies exactly as specified in `package-lock.json`.
- `npm run build` generates the optimized Next.js production build.
- `npm start` launches the production server.

`package-lock.json` is the authoritative source of dependency versions for all production and CI environments.

