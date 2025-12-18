import cron from 'node-cron';
import { generateRecurringTasks } from '@/app/actions/recurring';

let isSchedulerInitialized = false;
let cronJob: cron.ScheduledTask | null = null;
let isJobRunning = false;
let lastExecutionStart: number | null = null;
const MAX_EXECUTION_TIME_MS = 55000; // 55 seconds - slightly less than 60s to prevent overlap

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
    // Check if previous execution is still running
    if (isJobRunning) {
      const elapsed = lastExecutionStart ? Date.now() - lastExecutionStart : 0;
      if (elapsed > MAX_EXECUTION_TIME_MS) {
        console.warn(`[Cron] Previous execution exceeded max time (${elapsed}ms), allowing new execution`);
        isJobRunning = false;
        lastExecutionStart = null;
      } else {
        console.log(`[Cron] Previous execution still running (${elapsed}ms elapsed), skipping this run`);
        return;
      }
    }

    // Set lock
    isJobRunning = true;
    lastExecutionStart = Date.now();

    try {
      console.log('[Cron] Running recurring task generation check...');
      await generateRecurringTasks();
    } catch (error) {
      console.error('[Cron] Error in recurring task generation:', error);
    } finally {
      // Release lock
      isJobRunning = false;
      const executionTime = lastExecutionStart ? Date.now() - lastExecutionStart : 0;
      console.log(`[Cron] Execution completed in ${executionTime}ms`);
      lastExecutionStart = null;
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
