import { Router } from 'express';
import { AchievementController } from '../../../controllers/achievement.controller';

const router = Router();

// User achievements
router.get('/user', AchievementController.getUserAchievements);
// Achievement catalog
router.get('/catalog', AchievementController.getAchievementCatalog);

export default router;
