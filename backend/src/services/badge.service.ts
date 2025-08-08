import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BadgeService {
	// Get badge metadata (e.g., for display)
	async getBadgeMetadata(badgeId: string) {
		return await prisma.achievement.findUnique({
			where: { id: badgeId },
			select: {
				id: true,
				name: true,
				description: true,
				badgeUrl: true,
				category: true,
				rarity: true,
			},
		});
	}

	// Notify user of badge (e.g., send email)
	async notifyUserOfBadge(userId: string, badgeId: string) {
		const user = await prisma.user.findUnique({ where: { id: userId } });
		const badge = await prisma.achievement.findUnique({ where: { id: badgeId } });
		if (!user || !badge) return;
		try {
			const EmailNotifier = (await import('../utils/service/emailNotifier')).default;
			await EmailNotifier.sendAchievementEmail(
				user.email,
				badge.name,
				badge.description,
				badge.badgeUrl ?? '',
				badge.xpBonus ?? 0 
			);
		} catch (err) {
			// Log but do not block
			console.error('Failed to send badge notification:', err);
		}
	}

	// Generate achievement certificate/summary (could be a PDF, image, or data object)
	async generateCertificate(userId: string, achievementId: string) {
		if (!userId || typeof userId !== 'string' || userId.trim() === '') return null;
		if (!achievementId || typeof achievementId !== 'string' || achievementId.trim() === '') return null;
		const user = await prisma.user.findUnique({ where: { id: userId } });
		const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
		if (!user || !achievement) return null;
		// Return a summary object (TODO: implement PDF generation in future)
		const summary = {
			userName: user.firstName + ' ' + user.lastName,
			achievementName: achievement.name,
			achievementDescription: achievement.description,
			badgeUrl: achievement.badgeUrl,
			date: new Date().toISOString(),
		};
		// TODO: PDF/image generation can be added here using a library like pdfkit
		return summary;
	}
}
