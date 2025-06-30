import { PrismaClient, Status } from "@prisma/client"
import { v4 as uuidv4 } from "uuid"
import logger from "../core/config/logger"
import { BadRequestError, NotFoundError, InternalError } from "../core/api/ApiError"
import {
  Topic,
  CreateTopicRequest,
  UpdateTopicRequest,
  TopicFilter,
  TopicListResponse,
  TopicPrompt,
  TopicKeyword,
  TopicObjective,
  TopicChatContext,
} from "../models/interfaces/topic.interfaces"

enum EnglishLevel {
  BEGINNER = "BEGINNER",
  ELEMENTARY = "ELEMENTARY",
  INTERMEDIATE = "INTERMEDIATE",
  UPPER_INTERMEDIATE = "UPPER_INTERMEDIATE",
  ADVANCED = "ADVANCED",
  PROFICIENT = "PROFICIENT",
}

enum TopicCategory {
  GENERAL = "GENERAL",
  BUSINESS = "BUSINESS",
  TECHNOLOGY = "TECHNOLOGY",
  SCIENCE = "SCIENCE",
  HEALTH = "HEALTH",
  EDUCATION = "EDUCATION",
  ENTERTAINMENT = "ENTERTAINMENT",
  SPORTS = "SPORTS",
  TRAVEL = "TRAVEL",
  OTHER = "OTHER",
}

class TopicService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  /**
   * Create a new topic
   */
  async createTopic(data: CreateTopicRequest): Promise<Topic> {
    try {
      logger.info(`Creating new topic: ${data.name}`)

      // Validate English level and category
      this.validateEnglishLevel(data.englishLevel)
      this.validateTopicCategory(data.category)

      const topic = await this.prisma.topic.create({
        data: {
          id: uuidv4(),
          name: data.name,
          description: data.description,
          category: data.category as TopicCategory,
          englishLevel: data.englishLevel as EnglishLevel,
          prompts: data.prompts,
          keywords: data.keywords,
          objectives: data.objectives,
          status: Status.ACTIVE,
        },
      })

      logger.info(`Topic created successfully: ${topic.id}`)
      return this.formatTopicResponse(topic)
    } catch (error) {
      logger.error("Error creating topic:", error)
      if (error instanceof BadRequestError) throw error
      throw new InternalError("Failed to create topic")
    }
  }

  /**
   * Get all topics with filtering
   */
  async getTopics(filter: TopicFilter = {}, page = 1, limit = 20): Promise<TopicListResponse> {
    try {
      const skip = (page - 1) * limit
      const where: any = { status: Status.ACTIVE }

      // Apply filters
      if (filter.level) {
        this.validateEnglishLevel(filter.level)
        where.englishLevel = filter.level as EnglishLevel
      }

      if (filter.category) {
        this.validateTopicCategory(filter.category)
        where.category = filter.category as TopicCategory
      }

      if (filter.search) {
        where.OR = [
          { name: { contains: filter.search, mode: "insensitive" } },
          { description: { contains: filter.search, mode: "insensitive" } },
        ]
      }

      const [topics, total] = await Promise.all([
        this.prisma.topic.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ englishLevel: "asc" }, { name: "asc" }],
        }),
        this.prisma.topic.count({ where }),
      ])

      logger.info(`Retrieved ${topics.length} topics with filters:`, filter)

      return {
        topics: topics.map(this.formatTopicResponse),
        total,
        page,
        limit,
      }
    } catch (error) {
      logger.error("Error retrieving topics:", error)
      if (error instanceof BadRequestError) throw error
      throw new InternalError("Failed to retrieve topics")
    }
  }

  /**
   * Get topics by English level
   */
  async getTopicsByLevel(level: string): Promise<Topic[]> {
    try {
      this.validateEnglishLevel(level)

      const topics = await this.prisma.topic.findMany({
        where: {
          englishLevel: level as EnglishLevel,
          status: Status.ACTIVE,
        },
        orderBy: { name: "asc" },
      })

      logger.info(`Retrieved ${topics.length} topics for level ${level}`)
      return topics.map(this.formatTopicResponse)
    } catch (error) {
      logger.error(`Error retrieving topics for level ${level}:`, error)
      if (error instanceof BadRequestError) throw error
      throw new InternalError("Failed to retrieve topics by level")
    }
  }

  /**
   * Get topics by category
   */
  async getTopicsByCategory(category: string, level?: string): Promise<Topic[]> {
    try {
      this.validateTopicCategory(category)

      const where: any = {
        category: category as TopicCategory,
        status: Status.ACTIVE,
      }

      if (level) {
        this.validateEnglishLevel(level)
        where.englishLevel = level as EnglishLevel
      }

      const topics = await this.prisma.topic.findMany({
        where,
        orderBy: [{ englishLevel: "asc" }, { name: "asc" }],
      })

      logger.info(`Retrieved ${topics.length} topics for category ${category}`)
      return topics.map(this.formatTopicResponse)
    } catch (error) {
      logger.error(`Error retrieving topics for category ${category}:`, error)
      if (error instanceof BadRequestError) throw error
      throw new InternalError("Failed to retrieve topics by category")
    }
  }

  /**
   * Get single topic by ID
   */
  async getTopicById(id: string): Promise<Topic> {
    try {
      const topic = await this.prisma.topic.findUnique({
        where: { id, status: Status.ACTIVE },
      })

      if (!topic) {
        throw new NotFoundError("Topic not found")
      }

      logger.info(`Retrieved topic: ${topic.name}`)
      return this.formatTopicResponse(topic)
    } catch (error) {
      logger.error(`Error retrieving topic ${id}:`, error)
      if (error instanceof NotFoundError) throw error
      throw new InternalError("Failed to retrieve topic")
    }
  }

  /**
   * Update topic
   */
  async updateTopic(id: string, data: Partial<UpdateTopicRequest>): Promise<Topic> {
    try {
      // Check if topic exists
      const existingTopic = await this.prisma.topic.findUnique({
        where: { id, status: Status.ACTIVE },
      })

      if (!existingTopic) {
        throw new NotFoundError("Topic not found")
      }

      // Validate data if provided
      if (data.englishLevel) {
        this.validateEnglishLevel(data.englishLevel)
      }
      if (data.category) {
        this.validateTopicCategory(data.category)
      }

      const updateData: any = { ...data }
      if (data.englishLevel) updateData.englishLevel = data.englishLevel as EnglishLevel
      if (data.category) updateData.category = data.category as TopicCategory

      const topic = await this.prisma.topic.update({
        where: { id },
        data: updateData,
      })

      logger.info(`Topic updated successfully: ${topic.id}`)
      return this.formatTopicResponse(topic)
    } catch (error) {
      logger.error(`Error updating topic ${id}:`, error)
      if (error instanceof NotFoundError || error instanceof BadRequestError) throw error
      throw new InternalError("Failed to update topic")
    }
  }

  /**
   * Delete topic (soft delete)
   */
  async deleteTopic(id: string): Promise<void> {
    try {
      const topic = await this.prisma.topic.findUnique({
        where: { id, status: Status.ACTIVE },
      })

      if (!topic) {
        throw new NotFoundError("Topic not found")
      }

      await this.prisma.topic.update({
        where: { id },
        data: { status: Status.INACTIVE },
      })

      logger.info(`Topic deleted successfully: ${id}`)
    } catch (error) {
      logger.error(`Error deleting topic ${id}:`, error)
      if (error instanceof NotFoundError) throw error
      throw new InternalError("Failed to delete topic")
    }
  }

  /**
   * Get topic context for chat
   */
  async getTopicChatContext(topicId: string): Promise<TopicChatContext> {
    try {
      const topic = await this.getTopicById(topicId)

      return {
        topicId: topic.id,
        topicName: topic.name,
        category: topic.category,
        level: topic.englishLevel,
        currentPrompts: topic.prompts,
        keywords: topic.keywords,
        objectives: topic.objectives,
      }
    } catch (error) {
      logger.error(`Error getting topic chat context for ${topicId}:`, error)
      throw error
    }
  }

  /**
   * Get random topic prompts for a level
   */
  async getRandomPrompts(level: string, category?: string, count = 3): Promise<TopicPrompt[]> {
    try {
      this.validateEnglishLevel(level)

      const where: any = {
        englishLevel: level as EnglishLevel,
        status: Status.ACTIVE,
      }

      if (category) {
        this.validateTopicCategory(category)
        where.category = category as TopicCategory
      }

      const topics = await this.prisma.topic.findMany({ where })

      if (topics.length === 0) {
        return []
      }

      // Collect all prompts from matching topics
      const allPrompts: TopicPrompt[] = []
      topics.forEach((topic) => {
        const prompts = topic.prompts as TopicPrompt[]
        allPrompts.push(...prompts)
      })

      // Return random selection
      const shuffled = allPrompts.sort(() => 0.5 - Math.random())
      return shuffled.slice(0, count)
    } catch (error) {
      logger.error("Error getting random prompts:", error)
      if (error instanceof BadRequestError) throw error
      throw new InternalError("Failed to get random prompts")
    }
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): string[] {
    return Object.values(TopicCategory)
  }

  /**
   * Get available English levels
   */
  getAvailableLevels(): string[] {
    return Object.values(EnglishLevel)
  }

  /**
   * Validate English level
   */
  private validateEnglishLevel(level: string): void {
    if (!Object.values(EnglishLevel).includes(level as EnglishLevel)) {
      throw new BadRequestError(
        `Invalid English level: ${level}. Must be one of: ${Object.values(EnglishLevel).join(", ")}`,
      )
    }
  }

  /**
   * Validate topic category
   */
  private validateTopicCategory(category: string): void {
    if (!Object.values(TopicCategory).includes(category as TopicCategory)) {
      throw new BadRequestError(
        `Invalid topic category: ${category}. Must be one of: ${Object.values(TopicCategory).join(", ")}`,
      )
    }
  }

  /**
   * Format topic response
   */
  private formatTopicResponse = (topic: any): Topic => {
    return {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      category: topic.category,
      englishLevel: topic.englishLevel,
      prompts: topic.prompts as TopicPrompt[],
      keywords: topic.keywords as TopicKeyword[],
      objectives: topic.objectives as TopicObjective[],
      status: topic.status,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    }
  }
}

export default new TopicService()