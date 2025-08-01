


	import { PrismaClient } from '@prisma/client';

	export interface LeaderboardUser {
		userId: string;
		name: string;
		email: string;
		achievementsCount: number;
	}

	const prisma = new PrismaClient();

	export class AchievementService {
		// Get leaderboard for achievements (e.g., by total achievements earned)
		async getLeaderboard(page: number = 1, pageSize: number = 20): Promise<LeaderboardUser[]> {
			const skip = (page - 1) * pageSize;
			const users = await prisma.user.findMany({
				skip,
				take: pageSize,
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					userAchievements: {
						select: { achievementId: true }
					}
				}
			});
			const leaderboard: LeaderboardUser[] = users.map((u: any) => ({
				userId: u.id,
				name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
				email: u.email,
				achievementsCount: u.userAchievements.length
			})).sort((a: LeaderboardUser, b: LeaderboardUser) => b.achievementsCount - a.achievementsCount);
			return leaderboard;
		}
	// Check user progress against achievement requirements and award achievements
	async checkAchievementsForUser(userId: string) {
		const achievements = await prisma.achievement.findMany({ where: { isActive: true } });
		const userAchievements = await prisma.userAchievement.findMany({ where: { userId } });
		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user) return;

		for (const achievement of achievements) {
			const alreadyEarned = userAchievements.find((ua: { achievementId: string }) => ua.achievementId === achievement.id);
			if (alreadyEarned) continue;

			let progressValue: number = 0;
			let requirementMet: boolean = false;
			switch (achievement.requirementType) {
				case 'xp_total':
					progressValue = (user as any).xp ?? 0;
					requirementMet = progressValue >= achievement.requirementValue;
					break;
				case 'streak_days':
					progressValue = (user as any).streak ?? 0;
					requirementMet = progressValue >= achievement.requirementValue;
					break;
				// Add more cases for mastery, special, etc.
				default:
					// For custom logic, e.g., mastery, call helper functions
					break;
			}

			if (requirementMet) {
				await this.awardAchievement(userId, achievement.id, achievement.xpBonus);
			} else {
				await prisma.userAchievement.upsert({
					where: { userId_achievementId: { userId, achievementId: achievement.id } },
					update: { progressValue },
					create: {
						userId,
						achievementId: achievement.id,
						progressValue,
						isNotified: false,
					},
				});
			}
		}
	}

	// Award achievement and bonus XP
	async awardAchievement(userId: string, achievementId: string, xpBonus: number = 0) {
		await prisma.userAchievement.create({
			data: {
				userId,
				achievementId,
				progressValue: 0,
				isNotified: false,
			},
		});
			if (xpBonus > 0) {
				await prisma.user.update({
					where: { id: userId },
					data: { xp: { increment: xpBonus } },
				});
			}
			// Trigger notification (email, etc.)
			try {
				const user = await prisma.user.findUnique({ where: { id: userId } });
				const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
				if (user && achievement) {
					const EmailNotifier = (await import('../utils/service/emailNotifier')).default;
					await EmailNotifier.sendAchievementEmail(
						user.email,
						achievement.name,
						achievement.description,
						achievement.badgeUrl ?? '',
						achievement.xpBonus
					);
				}
			} catch (err) {
				// Log but do not block achievement awarding
				console.error('Failed to send achievement notification:', err);
			}
	}

	// Track achievement progress and completion
	async getUserAchievements(userId: string) {
		const earned = await prisma.userAchievement.findMany({
			where: { userId, progressValue: 0 },
			include: { achievement: true },
		});
		const inProgress = await prisma.userAchievement.findMany({
			where: { userId, progressValue: { gt: 0 } },
			include: { achievement: true },
		});
		const totalEarned = earned.length;
		const totalBonusXP = earned.reduce((sum: number, ua: any) => sum + (ua.achievement.xpBonus ?? 0), 0);
		const categoryCount: Record<string, number> = {};
		earned.forEach((ua: any) => {
			const cat = ua.achievement.category;
			categoryCount[cat] = (categoryCount[cat] || 0) + 1;
		});
		const categoryEntries: [string, number][] = Object.keys(categoryCount).map(key => [key, categoryCount[key]]);
		const favoriteCategory = categoryEntries.length > 0
			? categoryEntries.sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]
			: null;
		return {
			earned,
			inProgress,
			summary: { totalEarned, totalBonusXP, favoriteCategory },
		};
	}

	// Retroactive awards for past progress
	async retroactiveAward(userId: string) {
		await this.checkAchievementsForUser(userId);
	}

	// Get achievement catalog grouped by category
	async getAchievementCatalog() {
		const achievements = await prisma.achievement.findMany({ where: { isActive: true } });
		const categories: Record<string, any[]> = {};
		achievements.forEach((a: any) => {
			if (!categories[a.category]) categories[a.category] = [];
			categories[a.category].push({
				id: a.id,
				name: a.name,
				description: a.description,
				requirement: `${a.requirementType}: ${a.requirementValue}`,
				xpBonus: a.xpBonus,
				rarity: a.rarity,
			});
		});
		return { categories };
	}
}
