import { AppDataSource } from '../db';
import { Achievement } from '../models/entities/achievement.entity';
import { UserAchievement } from '../models/entities/user-achievement.entity';
import EmailNotifier from '../utils/emailNotifier';
import UserService from './user.service';

export class AchievementService {
  static async checkAndAward(
    userId: string,
    context: { xp?: number; streak?: number; questions_correct?: number }
  ) {
    const achRepo = AppDataSource.getRepository(Achievement);
    const uaRepo = AppDataSource.getRepository(UserAchievement);

    const all = await achRepo.find({ where: { isActive: true } });
    const earned = await uaRepo.find({ where: { userId } });
    const earnedIds = new Set(earned.map(u => u.achievementId));

    for (const ach of all) {
      if (earnedIds.has(ach.id)) continue;
      const progress = context[ach.requirementType] ?? 0;
      if (progress >= ach.requirementValue) {
        await uaRepo.save({ userId, achievementId: ach.id, progressValue: ach.requirementValue });
        if (ach.xpBonus) await UserService.addXP(userId, ach.xpBonus);
        await EmailNotifier.sendAchievementEmail(userId, ach);
      }
    }
  }

  static async getUserAchievements(userId: string) {
    const achRepo = AppDataSource.getRepository(Achievement);
    const uaRepo = AppDataSource.getRepository(UserAchievement);

    const earned = await uaRepo.find({ where: { userId }, relations: ['achievement'] });
    const all = await achRepo.find({ where: { isActive: true } });

    const inProgress = all.filter(a => !earned.find(e => e.achievementId === a.id));

    return { earned, inProgress };
  }
}