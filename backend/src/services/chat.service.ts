import { createDeepSeek } from "@ai-sdk/deepseek";
import * as AI from "ai";
import type { Prisma, PracticeLevel } from "@prisma/client";
import serverSettings from "../core/config/settings";
import { prisma } from "../db";
import logger from "../core/config/logger";
import { v4 as uuidv4 } from "uuid";

interface ConversationContext {
  role: "user" | "assistant" | "system";
  content: string;
}

interface SendMessageRequest {
  message: string;
  practiceLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  conversationContext?: ConversationContext[];
  conversationType?: string;
  conversationId?: string;
  userId: string;
}

interface SendMessageResponse {
  response: string;
  conversationId: string;
  timestamp: string;
}

class ChatService {
  private deepseekClient;

  constructor() {
    this.deepseekClient = createDeepSeek({
      apiKey: serverSettings.deepseek.apiKey,
      baseURL: serverSettings.deepseek.apiBase,
    });
  }

  private getPracticeLevelSystemPrompt(level: string): string {
    const prompts = {
      A1: "You are a helpful English conversation partner for beginners (A1 level). Use simple vocabulary, short sentences, and speak clearly. Help the user practice basic English conversation topics like greetings, family, hobbies, and daily activities. Be patient and encouraging.",
      A2: "You are a helpful English conversation partner for elementary learners (A2 level). Use common vocabulary and simple grammatical structures. Help with topics like travel, shopping, food, and personal experiences. Provide gentle corrections when needed.",
      B1: "You are a helpful English conversation partner for intermediate learners (B1 level). Use more varied vocabulary and grammar structures. Discuss topics like work, education, opinions, and experiences. Help the user express ideas more clearly and naturally.",
      B2: "You are a helpful English conversation partner for upper-intermediate learners (B2 level). Use sophisticated vocabulary and complex sentence structures. Engage in discussions about abstract topics, current events, and detailed explanations. Encourage fluency and accuracy.",
      C1: "You are a helpful English conversation partner for advanced learners (C1 level). Use a wide range of vocabulary and complex grammar. Discuss nuanced topics, academic subjects, and professional matters. Help refine subtle aspects of language use.",
      C2: "You are a helpful English conversation partner for proficient speakers (C2 level). Use native-level language with idioms, colloquialisms, and sophisticated expressions. Engage in complex debates, literary discussions, and specialized topics. Focus on perfecting nuanced language skills.",
    };
    return prompts[level as keyof typeof prompts] || prompts.B1;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const { message, practiceLevel, conversationContext = [], conversationType = "general", conversationId, userId } = request;

      // Fast guard: verify conversation ownership before external API calls
      if (conversationId) {
        const ok = await prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          select: { id: true },
        });
        if (!ok) {
          throw new Error("Conversation not found or unauthorized");
        }
      }

      const systemPrompt = this.getPracticeLevelSystemPrompt(practiceLevel);

      // Format messages for DeepSeek AI SDK
      let prompt = `${systemPrompt}\n\n`;
      
      // Add conversation context
      for (const ctx of conversationContext) {
        if (ctx.role === "user") {
          prompt += `User: ${ctx.content}\n`;
        } else if (ctx.role === "assistant") {
          prompt += `Assistant: ${ctx.content}\n`;
        }
      }
      
      // Add current message
      prompt += `User: ${message}\n\nAssistant: `;

      const { text: aiResponse } = await AI.generateText({
        model: this.deepseekClient(serverSettings.deepseek.model),
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });
      if (!aiResponse) {
        throw new Error("No response from DeepSeek AI");
      }

      let finalConversationId = conversationId;
      const timestamp = new Date().toISOString();

      if (conversationId) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const existingConversation = await tx.conversation.findUnique({
            where: { id: conversationId },
          });

          if (!existingConversation) {
            throw new Error("Conversation not found or unauthorized");
          }

          await tx.message.createMany({
            data: [
              {
                conversationId,
                role: "USER",
                content: message,
                timestamp: new Date(),
              },
              {
                conversationId,
                role: "ASSISTANT",
                content: aiResponse,
                timestamp: new Date(),
              },
            ],
          });
        });
      } else {
        await prisma.$transaction(async (tx: any) => {
          finalConversationId = uuidv4();

          const conversation = await tx.conversation.create({
            data: {
              id: finalConversationId,
              userId,
              practiceLevel: practiceLevel,
              conversationType,
            },
          });

          await tx.message.createMany({
            data: [
              {
                conversationId: conversation.id,
                role: "USER",
                content: message,
                timestamp: new Date(),
              },
              {
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: aiResponse,
                timestamp: new Date(),
              },
            ],
          });
        });
      }

      logger.info(`Chat message processed for user ${userId}, conversation ${finalConversationId}`);

      return {
        response: aiResponse,
        conversationId: finalConversationId!,
        timestamp,
      };
    } catch (error: any) {
      logger.error(`DeepSeek API error: ${error.message}`);
      if (error.status === 429) {
        throw new Error("DeepSeek API rate limit exceeded. Please try again later.");
      } else if (error.status === 400) {
        throw new Error("Invalid request to DeepSeek API.");
      } else if (error.message?.includes("Conversation not found")) {
        throw error;
      } else {
        throw new Error("Failed to generate response. Please try again later.");
      }
    }
  }

  async getConversationHistory(conversationId: string, userId: string) {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
        include: {
          messages: {
            orderBy: {
              timestamp: "asc",
            },
          },
        },
      });

      if (!conversation) {
        throw new Error("Conversation not found or unauthorized");
      }

      return conversation;
    } catch (error: any) {
      logger.error("Error in ChatService.getConversationHistory:", error);
      throw error;
    }
  }

  async getUserConversations(userId: string) {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          userId,
          status: "ACTIVE",
        },
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          messages: {
            orderBy: {
              timestamp: "desc",
            },
            take: 1,
          },
        },
      });

      return conversations;
    } catch (error: any) {
      logger.error("Error in ChatService.getUserConversations:", error);
      throw error;
    }
  }
}

export default new ChatService();