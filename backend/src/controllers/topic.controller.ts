import { Request, Response } from "express"
import asyncHandler from "../middlewares/async"
import topicService from "../services/topic.service"
import { SuccessResponse, BadRequestResponse, NotFoundResponse } from "../core/api/ApiResponse"
import logger from "../core/config/logger"
import { CreateTopicRequest, UpdateTopicRequest, TopicFilter } from "../models/interfaces/topic.interfaces"

class TopicController {
  /**
   * Create a new topic
   * POST /api/v1/topics
   */
  createTopic = asyncHandler(async (req: Request, res: Response) => {
    const data: CreateTopicRequest = req.body

    // Validate required fields
    if (!data.name || !data.description || !data.category || !data.englishLevel) {
      return new BadRequestResponse("Missing required fields: name, description, category, englishLevel").send(res)
    }

    if (!data.prompts || !Array.isArray(data.prompts) || data.prompts.length === 0) {
      return new BadRequestResponse("At least one prompt is required").send(res)
    }

    try {
      const topic = await topicService.createTopic(data)
      logger.info(`Topic created by user: ${req.user?.id}`)

      new SuccessResponse("Topic created successfully", { topic }).send(res)
    } catch (error: any) {
      logger.error("Error in createTopic controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get all topics with filtering
   * GET /api/v1/topics
   */
  getTopics = asyncHandler(async (req: Request, res: Response) => {
    const { level, category, status, search, page = "1", limit = "20" } = req.query

    const filter: TopicFilter = {
      level: level as string,
      category: category as string,
      status: status as string,
      search: search as string,
    }

    // Remove undefined values
    Object.keys(filter).forEach((key) => {
      if (filter[key as keyof TopicFilter] === undefined) {
        delete filter[key as keyof TopicFilter]
      }
    })

    try {
      const result = await topicService.getTopics(
        filter,
        Number.parseInt(page as string),
        Number.parseInt(limit as string),
      )

      new SuccessResponse("Topics retrieved successfully", result).send(res)
    } catch (error: any) {
      logger.error("Error in getTopics controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get topics by English level
   * GET /api/v1/topics/level/:level
   */
  getTopicsByLevel = asyncHandler(async (req: Request, res: Response) => {
    const { level } = req.params

    if (!level) {
      return new BadRequestResponse("English level is required").send(res)
    }

    try {
      const topics = await topicService.getTopicsByLevel(level)

      new SuccessResponse("Topics retrieved successfully", { topics }).send(res)
    } catch (error: any) {
      logger.error("Error in getTopicsByLevel controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get topics by category
   * GET /api/v1/topics/category/:category
   */
  getTopicsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.params
    const { level } = req.query

    if (!category) {
      return new BadRequestResponse("Category is required").send(res)
    }

    try {
      const topics = await topicService.getTopicsByCategory(category, level as string)

      new SuccessResponse("Topics retrieved successfully", { topics }).send(res)
    } catch (error: any) {
      logger.error("Error in getTopicsByCategory controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get single topic by ID
   * GET /api/v1/topics/:id
   */
  getTopicById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    if (!id) {
      return new BadRequestResponse("Topic ID is required").send(res)
    }

    try {
      const topic = await topicService.getTopicById(id)

      new SuccessResponse("Topic retrieved successfully", { topic }).send(res)
    } catch (error: any) {
      logger.error("Error in getTopicById controller:", error)
      if (error.message.includes("not found")) {
        return new NotFoundResponse("Topic not found").send(res)
      }
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Update topic
   * PUT /api/v1/topics/:id
   */
  updateTopic = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const data: Partial<UpdateTopicRequest> = req.body

    if (!id) {
      return new BadRequestResponse("Topic ID is required").send(res)
    }

    if (Object.keys(data).length === 0) {
      return new BadRequestResponse("At least one field is required for update").send(res)
    }

    try {
      const topic = await topicService.updateTopic(id, data)
      logger.info(`Topic updated by user: ${req.user?.id}`)

      new SuccessResponse("Topic updated successfully", { topic }).send(res)
    } catch (error: any) {
      logger.error("Error in updateTopic controller:", error)
      if (error.message.includes("not found")) {
        return new NotFoundResponse("Topic not found").send(res)
      }
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Delete topic
   * DELETE /api/v1/topics/:id
   */
  deleteTopic = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params

    if (!id) {
      return new BadRequestResponse("Topic ID is required").send(res)
    }

    try {
      await topicService.deleteTopic(id)
      logger.info(`Topic deleted by user: ${req.user?.id}`)

      new SuccessResponse("Topic deleted successfully", {}).send(res)
    } catch (error: any) {
      logger.error("Error in deleteTopic controller:", error)
      if (error.message.includes("not found")) {
        return new NotFoundResponse("Topic not found").send(res)
      }
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get random prompts
   * GET /api/v1/topics/prompts/random
   */
  getRandomPrompts = asyncHandler(async (req: Request, res: Response) => {
    const { level, category, count = "3" } = req.query

    if (!level) {
      return new BadRequestResponse("English level is required").send(res)
    }

    try {
      const prompts = await topicService.getRandomPrompts(
        level as string,
        category as string,
        Number.parseInt(count as string),
      )

      new SuccessResponse("Random prompts retrieved successfully", { prompts }).send(res)
    } catch (error: any) {
      logger.error("Error in getRandomPrompts controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get available categories
   * GET /api/v1/topics/categories
   */
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    try {
      const categories = topicService.getAvailableCategories()

      new SuccessResponse("Categories retrieved successfully", { categories }).send(res)
    } catch (error: any) {
      logger.error("Error in getCategories controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })

  /**
   * Get available English levels
   * GET /api/v1/topics/levels
   */
  getLevels = asyncHandler(async (req: Request, res: Response) => {
    try {
      const levels = topicService.getAvailableLevels()

      new SuccessResponse("English levels retrieved successfully", { levels }).send(res)
    } catch (error: any) {
      logger.error("Error in getLevels controller:", error)
      return new BadRequestResponse(error.message).send(res)
    }
  })
}

export default new TopicController()
