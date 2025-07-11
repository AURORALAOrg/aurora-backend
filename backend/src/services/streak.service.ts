import prisma from "@prisma/client";


export class StreakService {
  static async updateStreak(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    // Initialize lastStreakDate if not set
    if (!user.lastStreakDate) {
      return this.resetStreak(userId, today);
    }

    const lastStreakDate = new Date(user.lastStreakDate);
    lastStreakDate.setUTCHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastStreakDate.getTime()) / (86400 * 1000));

    if (diffDays === 0) return; // Already updated today

    // Maintain streak if within grace period (2 hours after midnight)
    if (diffDays === 1 || (diffDays === 2 && now.getUTCHours() < 2)) {
      const newStreak = user.currentStreak + 1;
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(user.longestStreak || 0, newStreak),
          lastStreakDate: today
        }
      });
    } else {
      // Break streak
      await this.resetStreak(userId, today);
    }
  }

  private static async resetStreak(userId: string, date: Date) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 1,
        lastStreakDate: date
      }
    });
  }

  static async checkStreakBreaks() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const inactiveUsers = await prisma.user.findMany({
      where: {
        lastActivityAt: { lt: yesterday },
        currentStreak: { gt: 0 }
      }
    });

    for (const user of inactiveUsers) {
      await this.resetStreak(user.id, new Date());
      // Send motivation email would go here
    }
  }
}