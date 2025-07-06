import { Request, Response } from 'express';
import { XPService } from '../services/xp.service';
import prisma from "@prisma/client";

export class GamificationController {
  static async awardXP(req: Request, res: Response) {
    try {
      const { questionId, isCorrect, timeSpent, timeLimit } = req.body;
      const userId = req.user.id;

      const xpAwarded = await XPService.awardXP(
        userId,
        questionId,
        isCorrect,
        timeSpent,
        timeLimit
      );

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalXP: true, currentStreak: true }
      });

      res.json({
        success: true,
        message: "XP awarded successfully",
        data: {
          xpAwarded,
          totalXP: user?.totalXP || 0,
          currentStreak: user?.currentStreak || 0,
          streakBonus: true,
          timeBonus: timeSpent < timeLimit * 0.5,
          levelUp: false
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getUserStats(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalXP: true,
          dailyXP: true,
          weeklyXP: true,
          currentStreak: true,
          longestStreak: true
        }
      });

      if (!user) throw new Error('User not found');

      const activities = await prisma.userActivity.findMany({
        where: { userId },
        select: { questionsCompleted: true }
      });

      res.json({
        success: true,
        data: {
          ...user,
          questionsCompleted: activities.reduce((sum, a) => sum + a.questionsCompleted, 0),
          accuracy: 87.5 // Placeholder
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}