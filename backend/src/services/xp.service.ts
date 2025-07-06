import prisma from "@prisma/client";
import { StreakService } from './streak.service';


export class XPService {
  static async calculateXP(
    pointsValue: number,
    difficultyMultiplier: number,
    currentStreak: number,
    timeSpent: number,
    timeLimit: number
  ) {
    const baseXP = pointsValue * difficultyMultiplier;
    const streakMultiplier = 1 + Math.min(currentStreak * 0.1, 1.0);
    const timeBonus = timeSpent < timeLimit * 0.5 ? 1.2 : 1.0;
    return Math.round(baseXP * streakMultiplier * timeBonus);
  }

  static async awardXP(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    timeSpent: number,
    timeLimit: number
  ) {
    if (!isCorrect) return 0;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { pointsValue: true, difficultyMultiplier: true }
    });

    if (!question) throw new Error('Question not found');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true }
    });

    const xp = await this.calculateXP(
      question.pointsValue,
      question.difficultyMultiplier,
      user?.currentStreak || 0,
      timeSpent,
      timeLimit
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: xp },
        dailyXP: { increment: xp },
        weeklyXP: { increment: xp },
        lastActivityAt: new Date()
      }
    });

    // Update activity tracking
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    await prisma.userActivity.upsert({
      where: { userId_activityDate: { userId, activityDate: today } },
      update: {
        xpEarned: { increment: xp },
        questionsCompleted: { increment: 1 }
      },
      create: {
        userId,
        activityDate: today,
        xpEarned: xp,
        questionsCompleted: 1
      }
    });

    await StreakService.updateStreak(userId);
    return xp;
  }
}