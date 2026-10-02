import { Router } from 'express';
import { chatController } from '../../../controllers/chat.controller';
import { isAuthorized } from '../../../middlewares/authentication';
import { validateChatRequest } from '../../../models/validations/chat.validators';
import { rateLimit } from '../../../middlewares/rateLimiter';

const router = Router();

const CHAT_RATE_LIMIT = parseInt(process.env.CHAT_RATE_LIMIT || '10');
const CHAT_RATE_WINDOW = parseInt(process.env.CHAT_RATE_WINDOW || '60000');

router.post(
  '/ai',
  isAuthorized,
  rateLimit({ windowMs: CHAT_RATE_WINDOW, max: CHAT_RATE_LIMIT }),
  validateChatRequest,
  chatController.sendMessage.bind(chatController)
);

export default router;
