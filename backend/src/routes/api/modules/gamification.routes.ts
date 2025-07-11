import express from 'express';
import { GamificationController } from '../../../controllers/gamification.controller';
import { isAuthorized } from '../../../middlewares/authentication';

const router = express.Router();

router.post('/award-xp', isAuthorized(), GamificationController.awardXP);
router.get('/stats', isAuthorized(), GamificationController.getUserStats);

export default router;