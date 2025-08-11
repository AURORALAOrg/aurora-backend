import { PrismaClient } from '@prisma/client';
import { StreakService } from './streak.service';

const prisma = new PrismaClient();

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
}

interface GameMetadata {
  pointsValue: number;
  difficultyMultiplier: number;
}

export class XPService {
  static async awardXP(userId: string, input: XPAwardInput): Promise<XPAwardResponse> {
    console.log('AwardXP input:', { userId, input });
    try {
      // Fetch question and metadata
      const question = await prisma.question.findUnique({
        where: { id: input.questionId },
        select: { gameMetadata: true },
      });
      console.log('Question fetched:', question);
      if (!question) throw new Error('Question not found');
      const gameMetadata = question.gameMetadata as unknown as GameMetadata;
      if (!gameMetadata) throw new Error('Game metadata missing from question');

      // Fetch user
      const user = await prisma.user.findUnique({ where: { id: userId } });
      console.log('User fetched:', user);
      if (!user) throw new Error('User not found');

      // Return no XP if incorrect
      if (!input.isCorrect) {
        return {
          xpAwarded: 0,
          totalXP: user.totalXP,
          currentStreak: user.currentStreak,
          streakBonus: false,
          timeBonus: false,
          levelUp: false,
        };
      }

      // XP calculation
      const baseXP = gameMetadata.pointsValue * gameMetadata.difficultyMultiplier;
      const streakMultiplier = 1 + Math.min(user.currentStreak * 0.1, 1.0);
      const isTimeBonus = input.timeSpent < input.timeLimit * 0.5;
      const timeMultiplier = isTimeBonus ? 1.2 : 1.0;
      const finalXP = Math.round(baseXP * streakMultiplier * timeMultiplier);
      console.log('XP calculation:', { baseXP, streakMultiplier, isTimeBonus, timeMultiplier, finalXP });

      // Update user XP
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          totalXP: { increment: finalXP },
          dailyXP: { increment: finalXP },
          weeklyXP: { increment: finalXP },
          lastActivityAt: new Date(),
        },
      });
      console.log('User updated:', updatedUser);

      // Update streak
      await StreakService.updateUserStreak(userId);

      // Track daily activity
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activity = await prisma.userActivity.upsert({
        where: {
          userId_activityDate: {
            userId,
            activityDate: today,
          },
        },
        update: {
          xpEarned: { increment: finalXP },
          questionsCompleted: { increment: 1 },
        },
        create: {
          userId,
          activityDate: today,
          xpEarned: finalXP,
          questionsCompleted: 1,
        },
      });
      console.log('UserActivity updated:', activity);

      // Level-up check
      const levelUp = this.checkLevelUp(user.totalXP, finalXP);

      const result = {
        xpAwarded: finalXP,
        totalXP: updatedUser.totalXP,
        currentStreak: updatedUser.currentStreak,
        streakBonus: streakMultiplier > 1,
        timeBonus: isTimeBonus,
        levelUp,
      };
      console.log('AwardXP result:', result);
      return result;
    } catch (error) {
      console.error('AwardXP error:', error);
      throw error;
    }
  }

  private static checkLevelUp(previousXP: number, xpAwarded: number): boolean {
    const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
    const oldLevel = thresholds.findIndex(t => previousXP < t) - 1;
    const newLevel = thresholds.findIndex(t => previousXP + xpAwarded < t) - 1;
    return newLevel > oldLevel;
  }

  static async getUserStats(userId: string) {
    console.log('getUserStats:', { userId });
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalXP: true,
          dailyXP: true,
          weeklyXP: true,
          currentStreak: true,
          longestStreak: true,
        },
      });
      console.log('User stats:', user);

      const activities = await prisma.userActivity.aggregate({
        where: { userId },
        _sum: { questionsCompleted: true },
        _avg: { xpEarned: true },
      });
      console.log('Activities aggregated:', activities);

      return {
        totalXP: user?.totalXP || 0,
        dailyXP: user?.dailyXP || 0,
        weeklyXP: user?.weeklyXP || 0,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
        questionsCompleted: activities._sum.questionsCompleted || 0,
        accuracy: activities._avg.xpEarned || 0,
      };
    } catch (error) {
      console.error('getUserStats error:', error);
      throw error;
    }
  }
}