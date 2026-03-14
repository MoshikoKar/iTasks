/**
 * Standalone entrypoint for the cron worker. Runs only the recurring task
 * scheduler (recurring tasks, due-date notifications, session cleanup)
 * without starting the Next.js server. Use when running a dedicated worker
 * process; set DISABLE_CRON_IN_APP=true on app instances.
 *
 * Requires DATABASE_URL (and any other env used by cron) to be set;
 * when run from project root, loads .env from cwd if present.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(cwd: string): void {
  const path = resolve(cwd, '.env');
  if (!existsSync(path)) return;
  try {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvFile(process.cwd());

async function main() {
  const { initializeRecurringTaskScheduler, stopRecurringTaskScheduler } = await import('../lib/cron');
  initializeRecurringTaskScheduler();

  const stop = () => {
    stopRecurringTaskScheduler();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('[Cron Worker] Failed to start:', err);
  process.exit(1);
});
