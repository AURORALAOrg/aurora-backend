import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StreakService {
  static async updateUserStreak(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastStreak = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
    lastStreak?.setHours(0, 0, 0, 0);

    const isSameDay = lastStreak && lastStreak.getTime() === today.getTime();
    const isYesterday = lastStreak && (today.getTime() - lastStreak.getTime()) === 24 * 60 * 60 * 1000;
    const isWithinGracePeriod = lastStreak && (new Date().getTime() - lastStreak.getTime()) <= 26 * 60 * 60 * 1000;

    if (isSameDay) {
      return; // No update needed
    } else if (isYesterday || isWithinGracePeriod) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: { increment: 1 },
          longestStreak: { set: Math.max(user.currentStreak + 1, user.longestStreak) },
          lastStreakDate: today,
        },
      });
    } else {
      // Streak broken
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: 1,
          lastStreakDate: today,
        },
      });
    }
  }
}

export default StreakService;