export class BadgeService {
  static getBadgeMetadata(achievement) {
    return {
      badgeUrl: achievement.badgeUrl,
      name: achievement.name,
      rarity: achievement.rarity,
    };
  }

  static generateCertificate(user, achievement) {
    return `/certificates/${user.id}/${achievement.id}.pdf`;
  }
}