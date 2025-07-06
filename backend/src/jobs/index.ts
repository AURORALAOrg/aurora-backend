import cron from 'node-cron';
import { DailyStreakJob } from './dailyStreak';

// Daily at 00:05 UTC
cron.schedule('5 0 * * *', () => {
  console.log('Running daily streak job...');
  DailyStreakJob.run();
});