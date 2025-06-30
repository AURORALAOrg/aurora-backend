import { Achievement } from '../models/entities/achievement.entity';
import { User } from '../models/entities/user-achievement.entity';

interface BadgeMetadata {
  badgeUrl: string;
  name: string;
  rarity: string;
}

export class BadgeService {
  static getBadgeMetadata(achievement: Achievement): BadgeMetadata {
    return {
      badgeUrl: achievement.badgeUrl,
      name: achievement.name,
      rarity: achievement.rarity,
    };
  }

  static generateCertificate(user: User, achievement: Achievement): string {
    if (!user?.id || !achievement?.id) {
      throw new Error('User and achievement must have valid IDs');
    }
    return `/certificates/${user.id}/${achievement.id}.pdf`;
  }
}
