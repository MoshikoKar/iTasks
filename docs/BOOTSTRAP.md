# Bootstrap Detection

Bootstrap mode is when no admin users exist. The app uses this to redirect unauthenticated users to the first-time setup flow (`/bootstrap`) and to choose the correct root layout.

## Behavior

- **Middleware**: On each request, the app checks whether the system is in bootstrap mode. If so, only `/bootstrap`, `/api/bootstrap`, `/api/branding`, and `/` are allowed; all other paths redirect to `/bootstrap`.
- **Root layout**: Uses the same check to render either the bootstrap (registration) layout or the normal authenticated layout.
- **API `/api/bootstrap`**: Before creating the first admin, it performs a fresh check (cache bypass). After successfully creating the first admin, it invalidates the bootstrap cache so the next request sees the updated state.

## Caching

The result of the admin-count check is cached in memory in `lib/bootstrap.ts`:

- **TTL**: 60 seconds by default. Override with `BOOTSTRAP_CACHE_TTL_MS` (e.g. `30000` for 30 seconds).
- **Re-evaluation**: After the TTL expires, the next call to `getNeedsBootstrap()` runs `db.user.count({ where: { role: "Admin" } })` again and updates the cache.
- **Invalidation**: When the first admin is created via `POST /api/bootstrap`, the cache is cleared so the next middleware/layout run will hit the database and see the new admin.

This reduces database load: without caching, every request would run a count query; with caching, at most one count runs per TTL window per process.

## Skipping the check (production)

In environments where the first admin has already been created and you want to avoid any per-request bootstrap check (e.g. high-traffic production):

- Set **`SKIP_BOOTSTRAP_CHECK=true`** (or `1` or `yes`).

When set, `getNeedsBootstrap()` always returns `false` (system is not in bootstrap mode) without querying the database. Use only when you are certain at least one admin exists; otherwise users may be sent to the normal login instead of the bootstrap flow on a fresh install.

## Fail-safe

If the database is unavailable or the count query throws, the helper returns `true` (assume bootstrap mode) so that users can still reach `/bootstrap` and attempt first-time setup.
