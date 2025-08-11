import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StreakService {
  static async updateUserStreak(userId: string): Promise<void> {
    console.log('updateUserStreak:', { userId });
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      console.log('User fetched:', user);
      if (!user) {
        console.error('User not found:', userId);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastStreak = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
      lastStreak?.setHours(0, 0, 0, 0);
      console.log('Streak dates:', { today, lastStreak });

      const isSameDay = lastStreak && lastStreak.getTime() === today.getTime();
      const isYesterday = lastStreak && (today.getTime() - lastStreak.getTime()) === 24 * 60 * 60 * 1000;
      const isWithinGracePeriod = lastStreak && (new Date().getTime() - lastStreak.getTime()) <= 26 * 60 * 60 * 1000;

      console.log('Streak conditions:', { isSameDay, isYesterday, isWithinGracePeriod });

      if (isSameDay) {
        console.log('No streak update needed');
        return;
      } else if (isYesterday || isWithinGracePeriod) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            currentStreak: { increment: 1 },
            longestStreak: { set: Math.max(user.currentStreak + 1, user.longestStreak) },
            lastStreakDate: today,
          },
        });
        console.log('Streak incremented:', updatedUser);
      } else {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            currentStreak: 1,
            lastStreakDate: today,
          },
        });
        console.log('Streak reset:', updatedUser);
      }
    } catch (error) {
      console.error('updateUserStreak error:', error);
      throw error;
    }
  }
}