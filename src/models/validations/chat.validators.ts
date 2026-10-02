import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

const VALID_PRACTICE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_CONVERSATION_TYPES = ['general', 'travel', 'business', 'academic', 'casual', 'restaurant', 'interview'];

export const validateChatRequest = [
  (req: Request, res: Response, next: NextFunction) => {
    const { message, conversationContext, practiceLevel, conversationType } = req.body;

    const errors: string[] = [];

    if (!message || typeof message !== 'string') {
      errors.push('Message is required and must be a string');
    } else if (message.trim().length === 0) {
      errors.push('Message cannot be empty');
    } else if (message.length > 2000) {
      errors.push('Message must be less than 2000 characters');
    }

    if (practiceLevel && !VALID_PRACTICE_LEVELS.includes(practiceLevel)) {
      errors.push(`Practice level must be one of: ${VALID_PRACTICE_LEVELS.join(', ')}`);
    }

    if (conversationType && !VALID_CONVERSATION_TYPES.includes(conversationType)) {
      errors.push(`Conversation type must be one of: ${VALID_CONVERSATION_TYPES.join(', ')}`);
    }

    if (conversationContext) {
      if (!Array.isArray(conversationContext)) {
        errors.push('Conversation context must be an array');
      } else if (conversationContext.length > 20) {
        errors.push('Conversation context cannot exceed 20 messages');
      } else {
        for (const msg of conversationContext) {
          if (!msg || typeof msg.content !== 'string' || !msg.role) {
            errors.push('Each conversation context message must have role and content');
            break;
          }
          if (!['user', 'assistant', 'system'].includes(msg.role)) {
            errors.push('Message role must be one of: user, assistant, system');
            break;
          }
        }
      }
    }

    const error = errors.join('; ');
    if (error) {
      res.status(400).json({ success: false, message: `Validation error: ${error}` });
      return;
    }

    next();
  },
];
