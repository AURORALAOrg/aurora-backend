import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { SuccessResponse, BadRequestResponse } from '../core/response';
import logger from '../core/config/logger';

class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) {
        res.status(401).json(new BadRequestResponse('User not authenticated'));
        return;
      }

      const { message, conversationContext = [], practiceLevel = 'B1', conversationType = 'general' } = req.body;

      logger.info(`Chat request from user ${userId}: level=${practiceLevel}, type=${conversationType}`);

      const result = await this.chatService.sendMessage({
        userId,
        message,
        conversationContext,
        practiceLevel,
        conversationType,
      });

      res.json(new SuccessResponse('Chat response generated successfully', result));
    } catch (error: any) {
      logger.error(`Chat error for user ${req.user?.id}: ${error.message}`);

      if (error.message?.includes('rate limit')) {
        res.status(429).json(new BadRequestResponse('Rate limit exceeded. Please try again later.'));
        return;
      }

      if (error.message?.includes('quota')) {
        res.status(503).json(new BadRequestResponse('Service temporarily unavailable. Please try again later.'));
        return;
      }

      res.status(500).json(new BadRequestResponse(error.message || 'Internal server error'));
    }
  }
}

export const chatController = new ChatController();
