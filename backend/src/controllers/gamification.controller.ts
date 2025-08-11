import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { XPService } from '../services/xp.service';
import { BadRequestError } from '../core/api/ApiError';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

const prisma = new PrismaClient();

export class GamificationController {
  public static async awardXP(req: AuthenticatedRequest, res: Response) {
    console.log('Award XP request:', req.body);
    try {
      if (!req.user?.id) throw new BadRequestError('User not authenticated');

      const userId = req.user.id;
      const result = await XPService.awardXP(userId, req.body);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      console.error('Award XP error:', error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ status: 'error', message: error.message });
      } else {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
      }
    }
  }

  public static async getUserStats(req: AuthenticatedRequest, res: Response) {
    console.log('Get stats request:', req.user);
    try {
      if (!req.user?.id) throw new BadRequestError('User not authenticated');

      const userId = req.user.id;
      const stats = await XPService.getUserStats(userId);

      res.status(200).json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ status: 'error', message: error.message });
      } else {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
      }
    }
  }

  public static async getLeaderboard(req: Request, res: Response) {
    console.log('Get leaderboard request');
    try {
      const { limit = 10, offset = 0 } = req.query;
      const parsedLimit = parseInt(limit as string);
      const parsedOffset = parseInt(offset as string);
      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new BadRequestError('Invalid query parameters');
      }

      const leaderboard = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          totalXP: true,
          currentStreak: true,
        },
        orderBy: { totalXP: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
      });

      res.status(200).json({
        status: 'success',
        data: leaderboard.map((user) => ({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          totalXP: user.totalXP,
          currentStreak: user.currentStreak,
        })),
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ status: 'error', message: error.message });
      } else {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
      }
    }
  }

  public static async getStreakHistory(req: AuthenticatedRequest, res: Response) {
    console.log('Get streak history request:', req.user);
    try {
      if (!req.user?.id) throw new BadRequestError('User not authenticated');

      const userId = req.user.id;
      const { limit = 30, offset = 0 } = req.query;
      const parsedLimit = parseInt(limit as string);
      const parsedOffset = parseInt(offset as string);
      if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
        throw new BadRequestError('Invalid query parameters');
      }

      const streakHistory = await prisma.userActivity.findMany({
        where: { userId },
        select: {
          activityDate: true,
          xpEarned: true,
          questionsCompleted: true,
        },
        orderBy: { activityDate: 'desc' },
        take: parsedLimit,
        skip: parsedOffset,
      });

      res.status(200).json({
        status: 'success',
        data: streakHistory,
      });
    } catch (error) {
      console.error('Get streak history error:', error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ status: 'error', message: error.message });
      } else {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
      }
    }
  }
}

export default GamificationController;