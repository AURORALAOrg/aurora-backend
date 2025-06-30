import { Request, Response } from 'express';
import { AchievementService } from '../services/achievement.service';

export class AchievementController {
  static async user(req: any, res: Response) {
    const userId = req.user.id;
    const { earned, inProgress } = await AchievementService.getUserAchievements(userId);
    res.json({ success: true, data: { earned, inProgress } });
  }

  static async catalog(_req: Request, res: Response) {
    const { earned: _, inProgress: _ip } = await AchievementService.getUserAchievements('');
    // reuse service to get all definitions
    const all = await AchievementService.getUserAchievements('dummy');
    // better: directly fetch Achievement definitions here
    res.json({ success: true, data: {/* grouped by category */} });
  }
}