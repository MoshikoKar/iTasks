export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DISABLE_CRON_IN_APP !== 'true') {
    const { initializeRecurringTaskScheduler } = await import('./lib/cron');
    initializeRecurringTaskScheduler();
  }
}
