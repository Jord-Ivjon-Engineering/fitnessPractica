import { checkAndKickExpiredUsers } from './telegramBot';

/**
 * Start the scheduled job to check for expired trials
 * Runs every hour by default
 */
export function startTelegramScheduler(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`🤖 Starting Telegram bot scheduler (checking every ${intervalMinutes} minutes)`);

  // Run immediately on start
  checkAndKickExpiredUsers();

  // Then run on schedule
  const interval = setInterval(() => {
    checkAndKickExpiredUsers();
  }, intervalMinutes * 60 * 1000);

  return interval;
}

/**
 * Stop the scheduler
 */
export function stopTelegramScheduler(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  console.log('🤖 Telegram bot scheduler stopped');
}

