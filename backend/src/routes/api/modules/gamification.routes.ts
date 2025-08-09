
import express from 'express';
import { GamificationController } from '../../../controllers/gamification.controller';
import { isAuthorized } from '../../../middlewares/authentication';
import { awardXPValidation } from '../../../models/validations/xp.validator';
import validateRequest from '../../../middlewares/validator';

const router = express.Router();

router.post(
  '/award-xp',
  isAuthorized(),
  validateRequest(awardXPValidation),
  GamificationController.awardXP
);

router.get(
  '/stats',
  isAuthorized(),
  GamificationController.getUserStats
);

export default router;