import express from 'express';
import { GamificationController } from '../../../controllers/gamification.controller';
import { isAuthorized, requireRole } from '../../../middlewares/authentication';
import { awardXPValidation, getUserStatsValidation } from '../../../models/validations/xp.validator';
import validateRequest from '../../../middlewares/validator';

const router = express.Router();

// Public leaderboard
router.get(
  '/leaderboard',
  GamificationController.getLeaderboard,
);

router.use(isAuthorized());

router.post(
  '/award-xp',
  requireRole("admin"),
  validateRequest(awardXPValidation),
  GamificationController.awardXP
);

router.get(
  '/stats',
  validateRequest(getUserStatsValidation),
  GamificationController.getUserStats,
);

router.get(
  '/streak-history',
  GamificationController.getStreakHistory,
);

export default router;