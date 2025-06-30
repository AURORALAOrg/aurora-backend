import OpenAI from "openai"
import { v4 as uuidv4 } from "uuid"
import serverSettings from "../core/config/settings"
import logger from "../core/config/logger"
import topicService from "./topic.service"
import type {
  ChatRequest,
  ChatMessage,
} from "../models/interfaces/chat.interfaces"

// Define ChatServiceConfig locally since it's not exported from chat.interfaces
type ChatServiceConfig = {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  retryAttempts: number
  retryDelay: number
}

// Define OpenAIResponse type locally since it's not exported from chat.interfaces
type OpenAIResponse = {
  response: string
  conversationId: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}
import type { TopicChatContext } from "../models/interfaces/topic.interfaces"
import { InternalError, BadRequestError } from "../core/api/ApiError"

// Define ConversationStarter type if not already imported
type ConversationStarter = {
  text: string
  category: string
  difficulty: string
}

class ChatService {
  private openai: OpenAI
  private config: ChatServiceConfig

  constructor() {
    if (!serverSettings.chat.apiKey) {
      throw new Error("OpenAI API key is required")
    }

    this.config = {
      apiKey: serverSettings.chat.apiKey,
      model: serverSettings.chat.openaiModel,
      maxTokens: serverSettings.chat.maxTokens,
      temperature: serverSettings.chat.temperature,
      retryAttempts: serverSettings.chat.retryAttempts,
      retryDelay: serverSettings.chat.retryDelay,
    }

    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
    })
  }

  /**
   * Generate AI chat response based on user input and context
   */
  async generateChatResponse(request: ChatRequest): Promise<OpenAIResponse> {
    try {
      const systemPrompt = await this.generateSystemPrompt(request)
      const messages = this.buildMessageHistory(systemPrompt, request.conversationContext, request.message)

      logger.info(
        `Generating chat response for ${request.practiceLevel} level ${request.conversationType} conversation`,
      )

      const response = await this.callOpenAIWithRetry(messages)

      return {
        response: response.content,
        conversationId: uuidv4(),
        usage: response.usage,
      }
    } catch (error) {
      logger.error("Error generating chat response:", error)

      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new BadRequestError("OpenAI API rate limit exceeded. Please try again later.")
        }
        if (error.status === 401) {
          throw new InternalError("OpenAI API authentication failed")
        }
        throw new InternalError(`OpenAI API error: ${error.message}`)
      }

      throw new InternalError("Failed to generate AI response")
    }
  }

  /**
   * Generate topic-based chat response
   */
  async generateTopicBasedResponse(
    request: ChatRequest & { topicId?: string },
  ): Promise<OpenAIResponse & { topicContext?: TopicChatContext }> {
    try {
      let topicContext: TopicChatContext | undefined

      if (request.topicId) {
        topicContext = await topicService.getTopicChatContext(request.topicId)
        logger.info(`Using topic context: ${topicContext.topicName}`)
      }

      const systemPrompt = await this.generateSystemPrompt(request, topicContext)
      const messages = this.buildMessageHistory(systemPrompt, request.conversationContext, request.message)

      const response = await this.callOpenAIWithRetry(messages)

      return {
        response: response.content,
        conversationId: uuidv4(),
        usage: response.usage,
        topicContext,
      }
    } catch (error) {
      logger.error("Error generating topic-based chat response:", error)
      throw error
    }
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callOpenAIWithRetry(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<{
    content: string
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        })

        const content = completion.choices[0]?.message?.content
        if (!content) {
          throw new Error("No content received from OpenAI")
        }

        return {
          content: this.sanitizeResponse(content),
          usage: completion.usage
            ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens,
              }
            : undefined,
        }
      } catch (error) {
        lastError = error as Error
        logger.warn(`OpenAI API attempt ${attempt} failed:`, error)

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt)
        }
      }
    }

    throw lastError || new Error("All retry attempts failed")
  }

  /**
   * Generate system prompt based on practice level, conversation type, and topic context
   */
  private async generateSystemPrompt(request: ChatRequest, topicContext?: TopicChatContext): Promise<string> {
    const levelDescriptions = {
      A1: "Use very simple vocabulary and basic grammar. Keep sentences short and clear. Focus on everyday topics like family, food, and hobbies.",
      A2: "Use simple vocabulary with some common expressions. Use present and past tenses mainly. Topics can include work, shopping, and local area.",
      B1: "Use clear standard language on familiar topics. You can discuss work, school, leisure activities, and express opinions simply.",
      B2: "Use more complex language and discuss abstract topics. You can handle detailed discussions and express viewpoints on current issues.",
      C1: "Use sophisticated language with nuanced expressions. Discuss complex topics with implicit meanings and cultural references.",
      C2: "Use highly sophisticated language with subtle distinctions. Handle all types of communication with precision and cultural sensitivity.",
    }

    const conversationTypes = {
      general: "everyday conversation topics like hobbies, weather, family, and personal experiences",
      business: "professional scenarios including meetings, presentations, negotiations, and workplace communication",
      travel: "travel-related situations like booking hotels, asking for directions, cultural exchanges, and tourism",
      academic: "educational topics, research discussions, academic presentations, and formal learning contexts",
      casual: "informal, friendly conversations with relaxed tone and colloquial expressions",
    }

    let basePrompt = `You are a helpful language learning assistant for ${request.practiceLevel} level English learners. 

IMPORTANT GUIDELINES:
- ${levelDescriptions[request.practiceLevel as keyof typeof levelDescriptions]}
- Focus on ${conversationTypes[request.conversationType as keyof typeof conversationTypes]}
- Be encouraging and supportive
- Correct major errors gently by modeling correct usage
- Ask follow-up questions to keep the conversation flowing
- Adapt your language complexity to the ${request.practiceLevel} level
- The user's native language context is ${request.userLanguage}
- Keep responses conversational and engaging
- Limit responses to 2-3 sentences to encourage back-and-forth dialogue`

    // Add topic-specific context if available
    if (topicContext) {
      basePrompt += `

TOPIC CONTEXT:
- Current Topic: ${topicContext.topicName}
- Topic Category: ${topicContext.category}
- Topic Level: ${topicContext.level}

TOPIC OBJECTIVES:
${topicContext.objectives.map((obj) => `- ${obj.skill.toUpperCase()}: ${obj.description}`).join("\n")}

KEY VOCABULARY FOR THIS TOPIC:
${topicContext.keywords
  .slice(0, 10) // Limit to first 10 keywords to avoid token overflow
  .map((keyword) => `- ${keyword.word}: ${keyword.definition}`)
  .join("\n")}

CONVERSATION PROMPTS TO USE:
${topicContext.currentPrompts
  .slice(0, 5) // Limit to first 5 prompts
  .map((prompt) => `- ${prompt.text}`)
  .join("\n")}

Please incorporate these topic elements naturally into the conversation while maintaining the appropriate difficulty level.`
    }

    basePrompt += `

Remember: Your goal is to help the user practice English conversation at their level while keeping them engaged and motivated.`

    return basePrompt
  }

  /**
   * Build message history for OpenAI API
   */
  private buildMessageHistory(
    systemPrompt: string,
    conversationContext: ChatMessage[],
    currentMessage: string,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }]

    // Add conversation context (limit to prevent token overflow)
    const maxHistory = Math.min(conversationContext.length, serverSettings.chat.maxConversationHistory)
    const recentContext = conversationContext.slice(-maxHistory)

    for (const msg of recentContext) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: this.sanitizeInput(msg.content),
        })
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: this.sanitizeInput(currentMessage),
    })

    return messages
  }

  /**
   * Get conversation starters based on level and type
   */
  async getConversationStarters(practiceLevel: string, conversationType: string): Promise<ConversationStarter[]> {
    try {
      // First try to get topic-based prompts
      const topicPrompts = await topicService.getRandomPrompts(practiceLevel, conversationType, 5)

      if (topicPrompts.length > 0) {
        return topicPrompts.map((prompt) => ({
          text: prompt.text,
          category: conversationType,
          difficulty: practiceLevel,
        }))
      }

      // Fallback to hardcoded starters if no topics available
      return this.getHardcodedStarters(practiceLevel, conversationType)
    } catch (error) {
      logger.warn("Error getting topic-based starters, using fallback:", error)
      return this.getHardcodedStarters(practiceLevel, conversationType)
    }
  }

  /**
   * Get hardcoded conversation starters (fallback)
   */
  private getHardcodedStarters(practiceLevel: string, conversationType: string): ConversationStarter[] {
    const starters: Record<string, Record<string, ConversationStarter[]>> = {
      A1: {
        general: [
          { text: "What is your name?", category: "introduction", difficulty: "A1" },
          { text: "Where are you from?", category: "introduction", difficulty: "A1" },
          { text: "What do you like to eat?", category: "food", difficulty: "A1" },
          { text: "Do you have any pets?", category: "family", difficulty: "A1" },
        ],
        business: [
          { text: "What is your job?", category: "work", difficulty: "A1" },
          { text: "Where do you work?", category: "work", difficulty: "A1" },
        ],
      },
      A2: {
        general: [
          { text: "What did you do yesterday?", category: "daily_life", difficulty: "A2" },
          { text: "What are your hobbies?", category: "interests", difficulty: "A2" },
          { text: "Can you describe your hometown?", category: "places", difficulty: "A2" },
        ],
        business: [
          { text: "How long have you worked here?", category: "work", difficulty: "A2" },
          { text: "What do you do in your job?", category: "work", difficulty: "A2" },
        ],
      },
      B1: {
        general: [
          { text: "What are your plans for the weekend?", category: "future_plans", difficulty: "B1" },
          { text: "Can you tell me about a memorable trip you took?", category: "experiences", difficulty: "B1" },
          { text: "What kind of music do you enjoy and why?", category: "preferences", difficulty: "B1" },
        ],
        business: [
          { text: "What challenges do you face in your work?", category: "work", difficulty: "B1" },
          { text: "How do you usually handle difficult customers?", category: "work", difficulty: "B1" },
        ],
      },
      B2: {
        general: [
          { text: "What do you think about social media's impact on society?", category: "opinions", difficulty: "B2" },
          { text: "How has technology changed the way we communicate?", category: "technology", difficulty: "B2" },
        ],
        business: [
          { text: "What trends do you see in your industry?", category: "work", difficulty: "B2" },
          { text: "How do you balance work and personal life?", category: "work", difficulty: "B2" },
        ],
      },
      C1: {
        general: [
          {
            text: "What role should governments play in addressing climate change?",
            category: "complex_topics",
            difficulty: "C1",
          },
          {
            text: "How do cultural differences affect international business relationships?",
            category: "culture",
            difficulty: "C1",
          },
        ],
        business: [
          { text: "What strategies would you use to enter a new market?", category: "strategy", difficulty: "C1" },
        ],
      },
      C2: {
        general: [
          {
            text: "How might artificial intelligence reshape society in the next decade?",
            category: "future",
            difficulty: "C2",
          },
        ],
        business: [
          {
            text: "What are the ethical implications of data collection in modern business?",
            category: "ethics",
            difficulty: "C2",
          },
        ],
      },
    }

    return starters[practiceLevel]?.[conversationType] || starters[practiceLevel]?.general || []
  }

  /**
   * Validate conversation context format
   */
  validateConversationContext(context: ChatMessage[]): boolean {
    if (!Array.isArray(context)) return false

    return context.every(
      (msg) =>
        msg &&
        typeof msg === "object" &&
        ["user", "assistant"].includes(msg.role) &&
        typeof msg.content === "string" &&
        msg.content.length > 0 &&
        msg.content.length <= 2000,
    )
  }

  /**
   * Sanitize user input
   */
  private sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .substring(0, 1000) // Limit length
  }

  /**
   * Sanitize AI response
   */
  private sanitizeResponse(response: string): string {
    return response
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .substring(0, 2000) // Limit length
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default new ChatService()
