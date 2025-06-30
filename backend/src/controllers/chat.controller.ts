import { Request, Response } from "express"
import asyncHandler from "../middlewares/async"
import chatService from "../services/chat.service"
import { SuccessResponse, BadRequestResponse } from "../core/api/ApiResponse"
import logger from "../core/config/logger"
import { ChatRequest } from "../models/interfaces/chat.interfaces"

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface User {
      id?: string
      // add other user properties if needed
    }
    interface Request {
      user?: User
    }
  }
}

class ChatController {
  /**
   * Send message to AI for conversation practice
   * POST /api/v1/chat/ai
   */
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const {
      message,
      conversationContext = [],
      practiceLevel,
      conversationType = "general",
      userLanguage = "en",
      topicId,
    }: ChatRequest & { topicId?: string } = req.body

    // Validate required fields
    if (!message || !practiceLevel) {
      return new BadRequestResponse("Message and practice level are required").send(res)
    }

    // Validate conversation context
    if (!chatService.validateConversationContext(conversationContext)) {
      return new BadRequestResponse("Invalid conversation context format").send(res)
    }

    try {
      let response

      if (topicId) {
        // Use topic-based chat
        response = await chatService.generateTopicBasedResponse({
          message,
          conversationContext,
          practiceLevel,
          conversationType,
          userLanguage,
          topicId,
        })
      } else {
        // Use general chat
        response = await chatService.generateChatResponse({
          message,
          conversationContext,
          practiceLevel,
          conversationType,
          userLanguage,
        })
      }

      logger.info(`Chat response generated for user: ${req.user?.id}`)

      new SuccessResponse("Chat response generated successfully", {
        response: response.response,
        conversationId: response.conversationId,
        timestamp: new Date().toISOString(),
        tokensUsed: response.usage?.totalTokens,
        practiceLevel,
        conversationType,
      }).send(res)
    } catch (error: any) {
      logger.error("Error in sendMessage controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get conversation starters
   * GET /api/v1/chat/starters
   */
  getConversationStarters = asyncHandler(async (req: Request, res: Response) => {
    const { practiceLevel, conversationType = "general" } = req.query

    if (!practiceLevel) {
      return new BadRequestResponse("Practice level is required").send(res)
    }

    try {
      const starters = await chatService.getConversationStarters(practiceLevel as string, conversationType as string)

      new SuccessResponse("Conversation starters retrieved successfully", { starters }).send(res)
    } catch (error: any) {
      logger.error("Error in getConversationStarters controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Health check for chat service
   * GET /api/v1/chat/health
   */
  healthCheck = asyncHandler(async (req: Request, res: Response) => {
    try {
      new SuccessResponse("Chat service is healthy", {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "chat",
      }).send(res)
    } catch (error: any) {
      logger.error("Error in chat health check:", error)
      return new BadRequestResponse("Chat service is unhealthy").send(res)
    }
  })
}

export default new ChatController()
