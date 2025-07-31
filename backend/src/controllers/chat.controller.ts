import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/async";
import ChatService from "../services/chat.service";
import { SuccessResponse, BadRequestResponse } from "../core/api/ApiResponse";
import logger from "../core/config/logger";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

interface SendMessageRequestBody {
  message: string;
  practiceLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  conversationContext?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  conversationType?: string;
  conversationId?: string;
}

export const sendMessage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { message, practiceLevel, conversationContext, conversationType, conversationId }: SendMessageRequestBody = req.body;
      const userId = req.user.id;

      if (!message || !practiceLevel) {
        return new BadRequestResponse("Message and practice level are required").send(res);
      }

      const result = await ChatService.sendMessage({
        message,
        practiceLevel,
        conversationContext,
        conversationType,
        conversationId,
        userId,
      });

      logger.info(`Chat message sent successfully for user ${userId}`);

      return new SuccessResponse("Chat response generated successfully", result).send(res);
    } catch (error: any) {
      logger.error("Error in sendMessage controller:", error);
      return new BadRequestResponse(error.message || "Failed to process chat message").send(res);
    }
  }
);

export const getConversationHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      if (!conversationId) {
        return new BadRequestResponse("Conversation ID is required").send(res);
      }

      const conversation = await ChatService.getConversationHistory(conversationId, userId);

      return new SuccessResponse("Conversation history retrieved successfully", conversation).send(res);
    } catch (error: any) {
      logger.error("Error in getConversationHistory controller:", error);
      
      if (error.message?.includes("not found")) {
        return new BadRequestResponse("Conversation not found or unauthorized").send(res);
      }
      
      return new BadRequestResponse(error.message || "Failed to retrieve conversation history").send(res);
    }
  }
);

export const getUserConversations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;

      const conversations = await ChatService.getUserConversations(userId);

      return new SuccessResponse("User conversations retrieved successfully", conversations).send(res);
    } catch (error: any) {
      logger.error("Error in getUserConversations controller:", error);
      return new BadRequestResponse(error.message || "Failed to retrieve conversations").send(res);
    }
  }
);