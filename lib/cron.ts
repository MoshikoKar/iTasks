import cron from 'node-cron';
import { generateRecurringTasks } from '@/app/actions/recurring';

let isSchedulerInitialized = false;
let cronJob: cron.ScheduledTask | null = null;

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
    try {
      console.log('[Cron] Running recurring task generation check...');
      await generateRecurringTasks();
    } catch (error) {
      console.error('[Cron] Error in recurring task generation:', error);
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
