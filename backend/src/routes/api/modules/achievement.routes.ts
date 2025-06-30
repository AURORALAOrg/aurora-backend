import { Router } from 'express';
import { AchievementController } from '../../../controllers/achievement.controller';
import auth from '../../../middlewares/auth';

const router = Router();
router.get('/user', auth, AchievementController.user);
router.get('/catalog', auth, AchievementController.catalog);
export default router;