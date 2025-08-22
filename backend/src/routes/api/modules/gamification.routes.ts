import express from 'express';
import { GamificationController } from '../../../controllers/gamification.controller';
import { isAuthorized, requireRole } from '../../../middlewares/authentication';
import { awardXPSchema, awardXPValidation } from '../../../models/validations/xp.validator';
import validateRequest from '../../../middlewares/validator';

const router = express.Router();

router.use(isAuthorized());

router.post(
  '/award-xp',
  requireRole("admin"),
  validateRequest({ body: awardXPSchema, awardXPValidation }),
  GamificationController.awardXP
);

router.get(
  '/stats',
  GamificationController.getUserStats
);

router.get(
  '/leaderboard',
  GamificationController.getLeaderboard
);

router.get(
  '/streak-history',
  GamificationController.getStreakHistory
);

export default router;