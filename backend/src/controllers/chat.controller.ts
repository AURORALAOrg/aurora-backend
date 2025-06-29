import type { Request, Response, NextFunction } from "express"
import { SuccessResponse, BadRequestResponse } from "../core/api/ApiResponse"
import ChatService from "../services/chat.service"
import type { ChatRequest, ChatResponse } from "../models/interfaces/chat.interfaces"
import logger from "../core/config/logger"
import asyncHandler from "../middlewares/async"

interface AuthenticatedRequest extends Request {
  user?: any
}

class ChatController {
  /**
   * Send message to AI and get response
   * POST /api/v1/chat/ai
   */
  sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return new BadRequestResponse("User authentication required").send(res)
      }

      const chatRequest: ChatRequest = {
        message: req.body.message,
        conversationContext: req.body.conversationContext || [],
        practiceLevel: req.body.practiceLevel,
        conversationType: req.body.conversationType || "general",
        userLanguage: req.body.userLanguage || "en",
      }

      // Validate conversation context
      if (!ChatService.validateConversationContext(chatRequest.conversationContext)) {
        return new BadRequestResponse("Invalid conversation context format").send(res)
      }

      logger.info(
        `Chat request from user ${userId}: ${chatRequest.practiceLevel} level, ${chatRequest.conversationType} type`,
      )

      // Generate AI response
      const serviceResponse = await ChatService.generateChatResponse(chatRequest)

      // Prepare response data
      const responseData: ChatResponse = {
        response: serviceResponse.response,
        conversationId: serviceResponse.conversationId,
        timestamp: new Date(),
        tokensUsed: serviceResponse.usage?.totalTokens,
        practiceLevel: chatRequest.practiceLevel,
        conversationType: chatRequest.conversationType,
      }

      logger.info(
        `Chat response sent to user ${userId}. Tokens used: ${serviceResponse.usage?.totalTokens || "unknown"}`,
      )

      return new SuccessResponse("Chat response generated successfully", responseData).send(res)
    } catch (error) {
      logger.error("Error in sendMessage:", error)
      next(error)
    }
  })

  /**
   * Get conversation starters for practice
   * GET /api/v1/chat/starters
   */
  getConversationStarters = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { practiceLevel = "B1", conversationType = "general" } = req.query

      if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(practiceLevel as string)) {
        return new BadRequestResponse("Invalid practice level").send(res)
      }

      const starters = ChatService.getConversationStarters(practiceLevel as string, conversationType as string)

      const responseData = {
        starters,
        practiceLevel,
        conversationType,
      }

      return new SuccessResponse("Conversation starters retrieved successfully", responseData).send(res)
    } catch (error) {
      logger.error("Error in getConversationStarters:", error)
      next(error)
    }
  })

  /**
   * Health check for chat service
   * GET /api/v1/chat/health
   */
  healthCheck = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const healthData = {
        status: "healthy",
        timestamp: new Date(),
        service: "chat",
        version: "1.0.0",
      }

      return new SuccessResponse("Chat service is healthy", healthData).send(res)
    } catch (error) {
      logger.error("Error in chat health check:", error)
      next(error)
    }
  })
}

export default new ChatController()
