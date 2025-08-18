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
      return {
        xpAwarded: 0,
        totalXP: 0,
        currentStreak: 0,
        streakBonus: false,
        timeBonus: false,
        levelUp: false,
      };
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const { pointsValue, timeLimit: questionTimeLimit, difficultyMultiplier } =
      question.gameMetadata as {
        pointsValue: number,
        timeLimit: number,
        difficultyMultiplier: number,
      } || { pointsValue: 10, timeLimit, difficultyMultiplier: 1 };


    // Update streak first to ensure correct multiplier
    await StreakService.updateUserStreak(userId);

    // Refetch user to get updated streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const streakMultiplier = user.currentStreak > 1 ? 1.1 : 1.0;

    // Use the question's configured time limit (fallback to function arg)
    const effectiveTimeLimit = questionTimeLimit ?? timeLimit;
    const timeBonusMult = timeSpent <= effectiveTimeLimit / 2 ? 1.2 : 1.0;

    const finalXP = Math.round(
      pointsValue * difficultyMultiplier * streakMultiplier * timeBonusMult
    );

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: finalXP },
        dailyXP: { increment: finalXP },
        weeklyXP: { increment: finalXP },
        lastActivityAt: new Date(),
      },
    });

    const { oldLevel, newLevel, levelUp } = this.checkLevelUp(
      user.totalXP,
      updatedUser.totalXP
    );

    const activityDate = utcStartOfToday();

    await prisma.userActivity.upsert({
      where: {
        userId_activityDate: {
          userId,
          activityDate, // Date object, not number
        },
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

    return {
      xpAwarded: finalXP,
      totalXP: updatedUser.totalXP,
      currentStreak: updatedUser.currentStreak,
      streakBonus: streakMultiplier > 1,
      timeBonus: timeBonusMult > 1,
      levelUp,
      oldLevel,
      newLevel,
    };
  }

  static async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const activities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { activityDate: 'desc' },
    });

    // Update streak first to ensure currentStreak is fresh
    await StreakService.updateUserStreak(userId);

    // Refetch user to get updated streak
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!updatedUser) {
      throw new Error('User not found after streak update');
    }

    const questionsCompleted = activities.reduce(
      (sum, activity) => sum + activity.questionsCompleted,
      0
    );

    // Placeholder accuracy (you may want to store correct/attempt counts)
    const accuracy = questionsCompleted
      ? Math.round((questionsCompleted / questionsCompleted) * 100) // = 100 for now
      : 0;

    return {
      totalXP: updatedUser.totalXP,
      dailyXP: updatedUser.dailyXP,
      weeklyXP: updatedUser.weeklyXP,
      currentStreak: updatedUser.currentStreak,
      longestStreak: updatedUser.longestStreak,
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