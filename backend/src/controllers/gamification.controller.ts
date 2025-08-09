import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { XPService } from '../services/xp.service';
import Jwt from '../utils/security/jwt';
import { BadRequestError } from '../core/api/ApiError';

// Define the AuthenticatedRequest interface to match QuestionController
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
    };
}

const prisma = new PrismaClient();

export class GamificationController {
    public static async awardXP(req: AuthenticatedRequest, res: Response) {
        try {
            // Check if user is authenticated
            if (!req.user?.id) {
                throw new BadRequestError('User not authenticated');
            }

            const userId = req.user.id;
            const result = await XPService.awardXP(userId, req.body);

            res.status(200).json({
                status: 'success',
                data: result
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        }
    }

    public static async getUserStats(req: AuthenticatedRequest, res: Response) {
        try {
            // Check if user is authenticated
            if (!req.user?.id) {
                throw new BadRequestError('User not authenticated');
            }

            const userId = req.user.id;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    totalXP: true,
                    dailyXP: true,
                    weeklyXP: true,
                    currentStreak: true,
                    longestStreak: true
                }
            });

            const activities = await prisma.userActivity.aggregate({
                where: { userId },
                _sum: { questionsCompleted: true },
                _avg: { xpEarned: true }
            });

            res.status(200).json({
                status: 'success',
                data: {
                    totalXP: user?.totalXP || 0,
                    dailyXP: user?.dailyXP || 0,
                    weeklyXP: user?.weeklyXP || 0,
                    currentStreak: user?.currentStreak || 0,
                    longestStreak: user?.longestStreak || 0,
                    questionsCompleted: activities._sum.questionsCompleted || 0,
                    accuracy: activities._avg.xpEarned || 0
                }
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        }
    }
}

export default GamificationController;