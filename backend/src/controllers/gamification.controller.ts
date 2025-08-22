import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../lib/prisma';
import { XPService } from '../services/xp.service';
import { BadRequestError, UnauthorizedError } from '../core/api/ApiError';
import logger from '../core/config/logger';


interface AuthenticatedRequest extends Request {
  user?: { id: string; role?: string };
}

// --- Validation ---
const awardXPSchema = Joi.object({
  questionId: Joi.string().min(1).required(),
  isCorrect: Joi.boolean().required(),
  timeSpent: Joi.number().integer().min(0).required(),
  timeLimit: Joi.number().integer().min(1).required(),
  targetUserId: Joi.string().uuid().optional(),
});

// --- Helpers ---
const MAX_LIMIT = 100;
function parseLimitOffset(q: Request['query'], defLimit = 10, defOffset = 0) {
  const rawLimit = q.limit ?? defLimit;
  const rawOffset = q.offset ?? defOffset;

  const limit = Number(rawLimit);
  const offset = Number(rawOffset);

  if (!Number.isFinite(limit) || !Number.isFinite(offset)) {
    throw new BadRequestError('Invalid query parameters');
  }

  return {
    limit: Math.min(Math.max(1, Math.trunc(limit)), MAX_LIMIT),
    offset: Math.max(0, Math.trunc(offset)),
  };
}


export class GamificationController {
  public static async awardXP(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.id) throw new UnauthorizedError("Unauthorized - User not authenticated");

      // 1) Validate body
      const body = await awardXPSchema.validateAsync(req.body);

      // 2) Normalize role & resolve target
      const isAdmin = String(req.user.role ?? "").toLowerCase() === "admin";
      const userId = isAdmin && body.targetUserId ? body.targetUserId : req.user.id;

      // 3) Pre-check existence to avoid FK/record-not-found throwing later
      const [question, targetUser] = await Promise.all([
        prisma.question.findUnique({ where: { id: body.questionId }, select: { id: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      ]);
      if (!question) throw new BadRequestError("Invalid questionId");
      if (!targetUser) throw new BadRequestError("Target user not found");

      // 4) Delegate to service
      const result = await XPService.awardXP(userId, body.questionId, body.isCorrect, body.timeSpent, body.timeLimit);
      return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
      if (error instanceof Joi.ValidationError) {
        return res
          .status(400)
          .json({ status: "error", message: error.details.map((i) => i.message).join("; ") });
      }
      if (error instanceof BadRequestError) {
        return res.status(400).json({ status: "error", message: error.message });
      }
      if (error instanceof UnauthorizedError) {
        return res.status(401).json({ status: "error", message: error.message });
      }
      // Prisma known cases if thrown inside service
      if (error?.code === "P2025") return res.status(404).json({ status: "error", message: "Record not found" });
      if (error?.code === "P2003") return res.status(400).json({ status: "error", message: "Invalid relation (FK)" });

      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  }

  public static async getUserStats(req: AuthenticatedRequest, res: Response) {
    logger.debug('Get stats request', { userId: req.user?.id });
    try {
      if (!req.user?.id) throw new UnauthorizedError('Unauthorized - User not authenticated');

      const stats = await XPService.getUserStats(req.user.id);
      return res.status(200).json({ status: "success", data: stats });
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ status: "error", message: error.message });
      }
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  }

  public static async getLeaderboard(req: Request, res: Response) {
    logger.debug('Get leaderboard request');
    try {
      const { limit, offset } = parseLimitOffset(req.query, 10, 0);

      const leaderboard = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          totalXP: true,
          currentStreak: true,
        },
        orderBy: { totalXP: 'desc' },
        take: limit,
        skip: offset,
      });

      res.status(200).json({
        status: 'success',
        data: leaderboard.map((u) => ({
          userId: u.id,
          name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          totalXP: u.totalXP,
          currentStreak: u.currentStreak,
        })),
      });
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ status: "error", message: error.message });
      }
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  }

  public static async getStreakHistory(req: AuthenticatedRequest, res: Response) {
    logger.debug('Get streak history request', { userId: req.user?.id });
    try {
      if (!req.user?.id) throw new UnauthorizedError('Unauthorized - User not authenticated');
      const { limit, offset } = parseLimitOffset(req.query, 30, 0);

      const streakHistory = await prisma.userActivity.findMany({
        where: { userId: req.user.id },
        select: {
          activityDate: true,
          xpEarned: true,
          questionsCompleted: true,
        },
        orderBy: { activityDate: 'desc' },
        take: limit,
        skip: offset,
      });

      return res.status(200).json({ status: 'success', data: streakHistory });
    } catch (error) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({ status: "error", message: error.message });
      }
      return res.status(500).json({ status: "error", message: "Internal server error" });
    }
  }
}

export default GamificationController;