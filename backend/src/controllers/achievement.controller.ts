import { Request, Response } from 'express';
import { AchievementService } from '../services/achievement.service';

// Define a request type that includes the authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

export class AchievementController {
 
  static async catalog(_req: Request, res: Response) {
    try {
      // Fetch all achievement definitions
      const achievements = await AchievementService.getAllAchievements();

      // Group by category
      const grouped = achievements.reduce((acc, ach) => {
        if (!acc[ach.category]) {
          acc[ach.category] = [];
        }
        acc[ach.category].push({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          requirement: {
            type: ach.requirementType,
            value: ach.requirementValue,
          },
          xpBonus: ach.xpBonus,
          badgeUrl: ach.badgeUrl,
          rarity: ach.rarity,
        });
        return acc;
      }, {} as Record<
        'progress' | 'streak' | 'mastery' | 'special',
        Array<{
          id: string;
          name: string;
          description: string;
          requirement: { type: string; value: number };
          xpBonus: number;
          badgeUrl?: string;
          rarity: string;
        }>
      >);

      return res.status(200).json({ success: true, data: { categories: grouped } });
    } catch (error) {
      console.error('Error fetching achievement catalog:', error);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to fetch achievement catalog' });
    }
  }

  /**
   * GET /api/v1/achievements/user
   * Returns the authenticated user's earned and in-progress achievements.
   */
  static async user(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { earned, inProgress } = await AchievementService.getUserAchievements(userId);

      // Shape earned achievements
      const earnedPayload = earned.map((ua: {
        achievement: {
          id: string;
          name: string;
          description: string;
          category: string;
          xpBonus: number;
          badgeUrl?: string;
        };
        earnedAt: string;
      }) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        category: ua.achievement.category,
        earnedAt: ua.earnedAt,
        xpBonus: ua.achievement.xpBonus,
        badgeUrl: ua.achievement.badgeUrl,
      }));

      // Shape in-progress achievements
      const inProgressPayload = inProgress.map((ach) => {
        // You may wish to compute actual progress here; placeholder zeros:
        const current = 0;
        return {
          id: ach.id,
          name: ach.name,
          description: ach.description,
          category: ach.category,
          currentProgress: current,
          requirementValue: ach.requirementValue,
          progressPercentage:
            ach.requirementValue > 0 ? Math.floor((current / ach.requirementValue) * 100) : 0,
        };
      });

      // Compute summary
      const totalBonusXP = earned.reduce((sum: number, ua) => sum + ua.achievement.xpBonus, 0);
      const categoryCounts = earned.reduce<Record<string, number>>((acc: Record<string, number>, ua) => {
        acc[ua.achievement.category] = (acc[ua.achievement.category] || 0) + 1;
        return acc;
      }, {});
      const favoriteCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const summary = {
        totalEarned: earned.length,
        totalBonusXP,
        favoriteCategory,
      };

      return res.status(200).json({
        success: true,
        data: {
          earned: earnedPayload,
          inProgress: inProgressPayload,
          summary,
        },
      });
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to fetch user achievements' });
    }
  }
}

export default AchievementController;
