import { Router } from 'express';
import authRoutes from './modules/auth.routes';
import accountRoutes from './modules/account.routes';
import walletRoutes from './modules/wallet.routes';
import questionRoutes from './modules/question.routes';
import achievementRoutes from './api/modules/achievement.routes';

const apiRoutes = Router();
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/account', accountRoutes);
apiRoutes.use('/wallet', walletRoutes);
apiRoutes.use('/questions', questionRoutes);
apiRoutes.use('/achievements', achievementRoutes);

export default apiRoutes;