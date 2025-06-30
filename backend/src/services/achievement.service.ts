import { AppDataSource } from '../db';
import { Achievement } from '../models/entities/achievement.entity';
import { UserAchievement } from '../models/entities/user-achievement.entity';
import EmailNotifier from '../utils/emailNotifier';
import UserService from './user.service';

export class AchievementService {
  static async checkAndAward(
    userId: string,
    context: {
      xp?: number;
      streak?: number;
      questions_correct?: number;
      special_event?: number;
    }
  ) {
    const achRepo = AppDataSource.getRepository(Achievement);
    const uaRepo = AppDataSource.getRepository(UserAchievement);

    const all = await achRepo.find({ where: { isActive: true } });
    const earned = await uaRepo.find({ where: { userId } });
    const earnedIds = new Set(earned.map((u) => u.achievementId));

    // Map requirementType → context key
    const contextKeyMap = {
      xp_total: 'xp',
      streak_days: 'streak',
      questions_correct: 'questions_correct',
      special_event: 'special_event',
    } as const;

    for (const ach of all) {
      if (earnedIds.has(ach.id)) continue;

      const key = contextKeyMap[ach.requirementType as keyof typeof contextKeyMap];
      if (!key) continue;

      const progress = context[key] ?? 0;
      if (progress >= ach.requirementValue) {
        await AppDataSource.transaction(async (manager) => {
          try {
            await manager.save(UserAchievement, {
              userId,
              achievementId: ach.id,
              progressValue: ach.requirementValue,
            });
            if (ach.xpBonus) await UserService.addXP(userId, ach.xpBonus);
            await EmailNotifier.sendAchievementEmail(userId, ach);
          } catch (err: any) {
            // 23505 = unique_violation in PostgreSQL
            if (err.code !== '23505') throw err;
          }
        });
      }
    }
  }
}
