import { prisma } from '../lib/prisma';

export class StreakService {
  static async updateUserStreak(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const lastStreak = user.lastStreakDate;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const isSameDay = !!(lastStreak && lastStreak.getTime() === today.getTime());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = !!(lastStreak && lastStreak.getTime() === yesterday.getTime());
    const now = new Date();
    const isWithinGracePeriod = !!(
      lastStreak && (now.getTime() - lastStreak.getTime()) <= 26 * 60 * 60 * 1000
    );

    if (isSameDay) {
      console.log('No streak update needed');
      return;
    } else if (isYesterday || isWithinGracePeriod) {
      // Only one update should succeed for a given day
      const inc = await prisma.user.updateMany({
        where: {
          id: userId,
          OR: [{ lastStreakDate: null }, { lastStreakDate: { lt: today } }],
        },
        data: {
          currentStreak: { increment: 1 },
          lastStreakDate: today,
        },
      });

      if (inc.count === 0) {
        console.log('Streak already updated today');
        return;
      }

      // Ensure longestStreak >= currentStreak
      await prisma.user.update({
        where: { id: userId },
        data: {
          longestStreak: {
            set: Math.max(user.longestStreak, user.currentStreak + 1),
          },
        },
      });

      console.log('Streak incremented');
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
  }
}