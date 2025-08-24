import { StreakService } from './streak.service';
import { prisma } from '../lib/prisma';

interface XPAwardInput {
  questionId: string;
  isCorrect: boolean;
  timeSpent: number;
  timeLimit: number;
}

interface XPAwardResponse {
  xpAwarded: number;
  totalXP: number;
  currentStreak: number;
  streakBonus: boolean;
  timeBonus: boolean;
  levelUp: boolean;
  oldLevel?: number;
  newLevel?: number;
}

interface GameMetadata {
  pointsValue: number;
  difficultyMultiplier: number;
  timeLimit: number;
}

function utcStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export class XPService {
  static async awardXP(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    timeSpent: number,
    timeLimit: number
  ): Promise<XPAwardResponse> {
    if (!isCorrect) {
      const now = new Date();
      // Count an attempt as "activity" to avoid unintended streak breaks by the daily job.
      await Promise.all([
        StreakService.updateUserStreak(userId),
        prisma.user.update({
          where: { id: userId },
          data: { lastActivityAt: now },
        }),
      ]);
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalXP: true, currentStreak: true },
      });
      return {
        xpAwarded: 0,
        totalXP: u?.totalXP ?? 0,
        currentStreak: u?.currentStreak ?? 0,
        streakBonus: false,
        timeBonus: false,
        levelUp: false,
      };
    }

    // Ensure streaks are up to date before computing multipliers
    await StreakService.updateUserStreak(userId);

    // Transaction for atomic award + activity write
    const result = await prisma.$transaction(async (tx) => {
      // Optional idempotency guard (skips if table doesn’t exist)
      let duplicate = false;
      try {
        // @ts-ignore - table may not exist yet; guarded by try/catch
        const found = await (tx as any).userQuestionXP?.findUnique?.({
          where: { userId_questionId: { userId, questionId } },
          select: { id: true },
        });
        duplicate = !!found;
      } catch (_) {
        // ignore if table not present
      }
      if (duplicate) {
        const u = await tx.user.findUnique({ where: { id: userId } });
        const xp = u?.totalXP ?? 0;
        const { oldLevel, newLevel } = XPService.checkLevelUp(xp, xp);
        return {
          xpAwarded: 0,
          totals: {
            totalXP: xp,
          },
          streak: {
            current: u?.currentStreak ?? 0,
          },
          bonuses: { streakMultiplier: 1.0, timeBonus: 1.0 },
          level: {
            old: oldLevel,
            new: newLevel,
            up: false
          },
        };
      }

      // Load question metadata
      const question = await tx.question.findUnique({
        where: { id: questionId },
        select: { gameMetadata: true },
      });
      if (!question) {
        throw new Error('Question not found');
      }

      const gm = (question.gameMetadata ?? {}) as Partial<GameMetadata>;
      const pointsValue = Number(gm.pointsValue ?? 10);
      const difficultyMultiplier = Number(gm.difficultyMultiplier ?? 1);
      const configuredTimeLimit = Number(gm.timeLimit ?? timeLimit ?? 30);
      const safeTimeLimit = Math.max(1, configuredTimeLimit);

      const effectiveTime = Math.max(0, Math.min(timeSpent, safeTimeLimit));
      const timeRemaining = Math.max(0, safeTimeLimit - effectiveTime);

      // Fetch user AFTER streak service runs to get fresh streak
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // === Spec-accurate multipliers ===
      // Base XP only if correct
      const baseXP = pointsValue * difficultyMultiplier;

      // 10% per day after day-1, capped at +100% => max 2x
      const streakDaysAfterFirst = Math.max(0, (user.currentStreak ?? 0) - 1);
      const streakMultiplier = 1 + Math.min(streakDaysAfterFirst, 10) * 0.1; // 1.0..2.0

      // +20% if > 50% of time remaining
      const timeBonus = timeRemaining > safeTimeLimit * 0.5 ? 1.2 : 1.0;

      const finalXP = Math.round(baseXP * streakMultiplier * timeBonus);

      // Update user totals
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          totalXP: { increment: finalXP },
          dailyXP: { increment: finalXP },
          weeklyXP: { increment: finalXP },
          lastActivityAt: new Date(),
        },
        select: {
          totalXP: true,
          dailyXP: true,
          weeklyXP: true,
          currentStreak: true,
          longestStreak: true,
        },
      });

      // Level-up check against previous total
      const { oldLevel, newLevel, levelUp } = XPService.checkLevelUp(
        (updated.totalXP ?? 0) - finalXP,
        updated.totalXP ?? 0
      );

      // Upsert UTC daily activity
      const activityDate = utcStartOfToday();
      await tx.userActivity.upsert({
        where: {
          userId_activityDate: { userId, activityDate },
        },
        update: {
          xpEarned: { increment: finalXP },
          questionsCompleted: { increment: 1 },
        },
        create: {
          userId,
          activityDate,
          xpEarned: finalXP,
          questionsCompleted: 1,
        },
      });

      try {
        await (tx as any).userQuestionXP?.create?.({
          data: {
            userId,
            questionId,
            xpAwarded: finalXP,
            totalXPAtAward: updated.totalXP,
            currentStreakAtAward: updated.currentStreak,
          },
        });
      } catch (_) {
        // ignore if table not present
      }

      return {
        xpAwarded: finalXP,
        totals: { totalXP: updated.totalXP },
        streak: { current: updated.currentStreak },
        bonuses: { streakMultiplier, timeBonus },
        level: { old: oldLevel, new: newLevel, up: levelUp },
      };
    });

    return {
      xpAwarded: result.xpAwarded,
      totalXP: result.totals.totalXP,
      currentStreak: result.streak.current,
      streakBonus: result.bonuses.streakMultiplier > 1,
      timeBonus: result.bonuses.timeBonus > 1,
      levelUp: result.level.up,
      oldLevel: result.level.old,
      newLevel: result.level.new,
    };
  }

  static async getUserStats(userId: string) {
    // Ensure streak freshness first
    await StreakService.updateUserStreak(userId);

    const [user, activities] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { activityDate: 'desc' },
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    const questionsCompleted = activities.reduce(
      (sum, a) => sum + a.questionsCompleted,
      0
    );
    const accuracy = questionsCompleted ? 100 : 0; // placeholder

    return {
      totalXP: user.totalXP,
      dailyXP: user.dailyXP,
      weeklyXP: user.weeklyXP,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      questionsCompleted,
      accuracy,
    };
  }

  private static checkLevelUp(oldXP: number, newXP: number) {
    const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];

    let oldLevel = 0;
    let newLevel = 0;

    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (oldXP >= thresholds[i]) {
        oldLevel = i;
        break;
      }
    }

    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (newXP >= thresholds[i]) {
        newLevel = i;
        break;
      }
    }

    return {
      oldLevel,
      newLevel,
      levelUp: newLevel > oldLevel,
    };
  }
}
