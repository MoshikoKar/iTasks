export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeRecurringTaskScheduler } = await import('./lib/cron');
    initializeRecurringTaskScheduler();
  }
}
