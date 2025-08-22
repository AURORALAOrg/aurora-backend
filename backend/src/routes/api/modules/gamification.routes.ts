import express from 'express';
import { GamificationController } from '../../../controllers/gamification.controller';
import { isAuthorized, requireRole } from '../../../middlewares/authentication';
import { awardXPSchema, getUserStatsValidation } from '../../../models/validations/xp.validator';
import validateRequest from '../../../middlewares/validator';

const router = express.Router();

router.use(isAuthorized());

router.post(
  '/award-xp',
  requireRole("admin"),
  validateRequest({ body: awardXPSchema }),
  GamificationController.awardXP
);

router.get('/stats', isAuthorized(), validateRequest(getUserStatsValidation), GamificationController.getUserStats);

router.get('/leaderboard', isAuthorized(), GamificationController.getLeaderboard);

router.get('/streak-history', isAuthorized(), GamificationController.getStreakHistory);

export default router;