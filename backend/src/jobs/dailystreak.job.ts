import { schedule } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { StreakService } from '../services/streak.service';
import EmailNotifier from '../utils/service/emailNotifier';

const prisma = new PrismaClient();

export class DailyStreakJob {
  static async updateAllUserStreaks() {
    console.log('Running daily streak update at', new Date().toISOString());
    try {
      const users = await prisma.user.findMany({ select: { id: true } });
      for (const user of users) {
        await StreakService.updateUserStreak(user.id);
      }
      console.log('Streaks updated for', users.length, 'users');
    } catch (error) {
      console.error('Error updating streaks:', error);
      throw error;
    }
  }

  static async resetDailyCounters() {
    console.log('Resetting daily XP at', new Date().toISOString());
    try {
      await prisma.user.updateMany({
        data: { dailyXP: 0 },
      });
      console.log('Daily XP reset for all users');
    } catch (error) {
      console.error('Error resetting daily XP:', error);
      throw error;
    }
  }

  static async sendMotivationEmails() {
    console.log('Sending motivational emails at', new Date().toISOString());
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const users = await prisma.user.findMany({
        where: {
          lastStreakDate: {
            lt: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          },
          isEmailVerified: true,
        },
        select: { id: true, email: true, firstName: true },
      });
      for (const user of users) {
        if (!user.email || !user.firstName) continue;
        await EmailNotifier.sendMotivationalEmail(user.email, user.firstName);
      }
      console.log('Motivational emails sent to', users.length, 'users');
    } catch (error) {
      console.error('Error sending motivational emails:', error);
      throw error;
    }
  }
}

// Schedule at 00:05 UTC
schedule('5 0 * * *', async () => {
  console.log('Starting daily CRON job');
  try {
    await DailyStreakJob.updateAllUserStreaks();
    await DailyStreakJob.resetDailyCounters();
    await DailyStreakJob.sendMotivationEmails();
  } catch (error) {
    console.error('CRON job error:', error);
  }
});

// Ensure graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});