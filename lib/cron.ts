import cron from 'node-cron';
import { generateRecurringTasks } from '@/app/actions/recurring';
import { db } from './db';

let isSchedulerInitialized = false;
let cronJob: cron.ScheduledTask | null = null;
const LOCK_KEY = 123456789; // Unique key for the recurring task lock
const MAX_EXECUTION_TIME_MS = 55000; // 55 seconds - slightly less than 60s to prevent overlap

/**
 * Attempt to acquire a distributed lock using PostgreSQL advisory locks
 */
async function acquireLock(): Promise<boolean> {
  try {
    // Use PostgreSQL advisory lock - pg_try_advisory_lock returns true if lock acquired
    const result = await db.$queryRaw<{ lock_acquired: boolean }[]>`
      SELECT pg_try_advisory_lock(${LOCK_KEY}) as lock_acquired
    `;
    return result[0]?.lock_acquired || false;
  } catch (error) {
    console.error('[Cron] Error acquiring lock:', error);
    return false;
  }
}

/**
 * Release the distributed lock
 */
async function releaseLock(): Promise<void> {
  try {
    await db.$queryRaw`
      SELECT pg_advisory_unlock(${LOCK_KEY})
    `;
  } catch (error) {
    console.error('[Cron] Error releasing lock:', error);
  }
}

export function initializeRecurringTaskScheduler() {
  if (isSchedulerInitialized) {
    console.log('[Cron] Scheduler already initialized, skipping...');
    return;
  }

  if (process.env.NODE_ENV === 'test') {
    console.log('[Cron] Test environment detected, skipping scheduler initialization');
    return;
  }

  console.log('[Cron] Initializing recurring task scheduler...');

  cronJob = cron.schedule('* * * * *', async () => {
    const executionStart = Date.now();

    // Attempt to acquire distributed lock
    const lockAcquired = await acquireLock();
    if (!lockAcquired) {
      console.log('[Cron] Another instance is already running, skipping this execution');
      return;
    }

    try {
      console.log('[Cron] Running recurring task generation check...');
      await generateRecurringTasks();

      const executionTime = Date.now() - executionStart;
      console.log(`[Cron] Execution completed successfully in ${executionTime}ms`);
    } catch (error) {
      const executionTime = Date.now() - executionStart;
      console.error(`[Cron] Error in recurring task generation after ${executionTime}ms:`, error);
    } finally {
      // Always release the lock
      await releaseLock();
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Jerusalem'
  });

  isSchedulerInitialized = true;
  console.log('[Cron] Recurring task scheduler initialized (runs every minute)');
}

export function stopRecurringTaskScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    isSchedulerInitialized = false;
    console.log('[Cron] Recurring task scheduler stopped');
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  initializeRecurringTaskScheduler();
}
