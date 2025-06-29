import OpenAI from "openai"
import { v4 as uuidv4 } from "uuid"
import serverSettings from "../core/config/settings"
import logger from "../core/config/logger"
import { ChatRequest, ChatMessage, ChatServiceResponse, OpenAIUsage } from "../models/interfaces/chat.interfaces"
import { InternalError, BadRequestError } from "../core/api/ApiError"

class ChatService {
  private openai: OpenAI
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // 1 second

  constructor() {
    this.openai = new OpenAI({
      apiKey: serverSettings.openai.apiKey,
    })
  }

  /**
   * Generate system prompt based on practice level and conversation type
   */
  private generateSystemPrompt(practiceLevel: string, conversationType: string, userLanguage: string): string {
    const levelDescriptions = {
      A1: "beginner level with simple vocabulary and basic grammar",
      A2: "elementary level with everyday expressions and simple sentences",
      B1: "intermediate level with clear standard language on familiar topics",
      B2: "upper-intermediate level with complex texts and abstract topics",
      C1: "advanced level with implicit meaning and flexible language use",
      C2: "proficient level with nuanced expression and sophisticated language",
    }

    const typeDescriptions = {
      general: "everyday conversation topics",
      business: "professional and workplace scenarios",
      travel: "travel-related situations and cultural exchanges",
      academic: "educational topics and formal discussions",
      casual: "informal, friendly conversations",
    }

    return `You are a helpful language learning assistant for ${levelDescriptions[practiceLevel as keyof typeof levelDescriptions]} English practice. 

Focus on ${typeDescriptions[conversationType as keyof typeof typeDescriptions]}.

Guidelines:
- Adapt your language complexity to ${practiceLevel} level
- Provide natural, engaging responses
- Occasionally ask follow-up questions to encourage conversation
- If the user makes grammar or vocabulary mistakes, gently correct them in a supportive way
- Keep responses conversational and encouraging
- Limit responses to 2-3 sentences to maintain natural flow
- Use vocabulary and grammar appropriate for ${practiceLevel} level

The user's native language context is ${userLanguage}, so be mindful of common challenges speakers of that language face when learning English.`
  }

  /**
   * Prepare messages for OpenAI API call
   */
  private prepareMessages(request: ChatRequest): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const systemPrompt = this.generateSystemPrompt(
      request.practiceLevel,
      request.conversationType,
      request.userLanguage,
    )

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }]

    // Add conversation context (limit to last 10 messages to manage token usage)
    const recentContext = request.conversationContext.slice(-10)
    recentContext.forEach((msg) => {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })
    })

    // Add current user message
    messages.push({
      role: "user",
      content: request.message,
    })

    return messages
  }

  /**
   * Make API call to OpenAI with retry logic
   */
  private async callOpenAI(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    retryCount = 0,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: serverSettings.openai.model,
        messages,
        max_tokens: serverSettings.openai.maxTokens,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      })

      return completion
    } catch (error: any) {
      logger.error(`OpenAI API call failed (attempt ${retryCount + 1}):`, error)

      // Handle specific OpenAI errors
      if (error.status === 429) {
        throw new BadRequestError("Rate limit exceeded. Please try again later.")
      }

      if (error.status === 401) {
        throw new InternalError("OpenAI API authentication failed")
      }

      if (error.status === 400) {
        throw new BadRequestError("Invalid request to OpenAI API")
      }

      // Retry logic for transient errors
      if (retryCount < this.maxRetries && (error.status >= 500 || error.code === "ECONNRESET")) {
        await this.delay(this.retryDelay * (retryCount + 1))
        return this.callOpenAI(messages, retryCount + 1)
      }

      throw new InternalError("Failed to generate AI response")
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Sanitize AI response content
   */
  private sanitizeResponse(content: string): string {
    // Remove any potentially harmful content
    return content
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .substring(0, 1000) // Limit response length
  }

  /**
   * Generate chat response using OpenAI
   */
  async generateChatResponse(request: ChatRequest): Promise<ChatServiceResponse> {
    try {
      logger.info(
        `Generating chat response for practice level: ${request.practiceLevel}, type: ${request.conversationType}`,
      )

      const messages = this.prepareMessages(request)
      const completion = await this.callOpenAI(messages)

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new InternalError("No response generated from AI service")
      }

      const sanitizedResponse = this.sanitizeResponse(response)
      const conversationId = uuidv4()

      const usage: OpenAIUsage | undefined = completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined

      logger.info(`Chat response generated successfully. Tokens used: ${usage?.totalTokens || "unknown"}`)

      return {
        response: sanitizedResponse,
        usage,
        conversationId,
      }
    } catch (error) {
      logger.error("Error in generateChatResponse:", error)
      throw error
    }
  }

  /**
   * Validate conversation context
   */
  validateConversationContext(context: ChatMessage[]): boolean {
    if (!Array.isArray(context)) return false

    return context.every(
      (msg) =>
        msg.role &&
        ["user", "assistant", "system"].includes(msg.role) &&
        msg.content &&
        typeof msg.content === "string" &&
        msg.content.length <= 2000,
    )
  }

  /**
   * Get conversation suggestions based on practice level
   */
  getConversationStarters(practiceLevel: string, conversationType: string): string[] {
    const starters: Record<string, Record<string, string[]>> = {
      A1: {
        general: ["Hello! How are you today?", "What is your name?", "Where are you from?", "What do you like to do?"],
        travel: [
          "I am going to London. Can you help me?",
          "Where is the airport?",
          "How much does this cost?",
          "I need a hotel room.",
        ],
      },
      B1: {
        general: [
          "What are your hobbies and interests?",
          "Can you tell me about your typical day?",
          "What kind of music do you enjoy?",
          "What are your plans for the weekend?",
        ],
        business: [
          "I have a job interview tomorrow. Can you help me practice?",
          "How do I write a professional email?",
          "What should I wear to a business meeting?",
          "Can you help me with presentation skills?",
        ],
      },
      C1: {
        academic: [
          "I'd like to discuss the implications of artificial intelligence on society.",
          "What are your thoughts on sustainable development?",
          "Can we explore different philosophical perspectives?",
          "Let's analyze current global economic trends.",
        ],
      },
    }

    return starters[practiceLevel]?.[conversationType] || starters.A1.general
  }
}

export default new ChatService()
