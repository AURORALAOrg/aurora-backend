import { Request, Response } from 'express';
import { AchievementService } from '../services/achievement.service';

// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

const achievementService = new AchievementService();

export class AchievementController {
  // GET /api/v1/achievements/user
  static async getUserAchievements(req: Request, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized: User not found.' });
      }
      const userId = req.user.id;
      const data = await achievementService.getUserAchievements(userId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      const isDev = process.env.SERVER_ENVIRONMENT === 'DEVELOPMENT';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch achievements.',
        error: isDev ? ((error as Error)?.message || (error as Error)?.stack || String(error)) : undefined
      });
    }
  }

  // GET /api/v1/achievements/leaderboard
  static async getLeaderboard(req: Request, res: Response) {
    try {
      // Example: leaderboard by total achievements earned
      const leaderboard = await achievementService.getLeaderboard();
      return res.status(200).json({ success: true, data: leaderboard });
    } catch (error) {
      const isDev = process.env.SERVER_ENVIRONMENT === 'DEVELOPMENT';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard.',
        error: isDev ? ((error as Error)?.message || (error as Error)?.stack || String(error)) : undefined
      });
    }
  }

  // GET /api/v1/achievements/catalog
  static async getAchievementCatalog(req: Request, res: Response) {
    try {
      // Group achievements by category
      const achievements = await achievementService.getAchievementCatalog();
      return res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      const isDev = process.env.SERVER_ENVIRONMENT === 'DEVELOPMENT';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch achievement catalog.',
        error: isDev ? ((error as Error)?.message || (error as Error)?.stack || String(error)) : undefined
      });
    }
  }
}
