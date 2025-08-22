import { PrismaClient } from "@prisma/client";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock the AI SDK
const mockGenerateText = jest.fn();
const mockDeepseekClient = jest.fn().mockReturnValue("deepseek-model-instance");

// Mock the ai package
jest.mock("ai", () => {
  return { generateText: mockGenerateText };
});

// Mock the DeepSeek client
jest.mock("@ai-sdk/deepseek", () => {
  return {
    createDeepSeek: jest.fn().mockReturnValue(mockDeepseekClient)
  };
});

const mockPrisma = {
  conversation: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  message: {
    createMany: jest.fn(),
  },
} as any;

jest.mock("../../src/db", () => ({
  prisma: mockPrisma,
}));

jest.mock("../../src/core/config/settings", () => ({
  deepseek: {
    apiKey: "test-api-key",
    model: "deepseek-chat",
    apiBase: "https://api.deepseek.com/v1",
  },
}));

jest.mock("../../src/core/config/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

import ChatService from "../../src/services/chat.service";

describe("ChatService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should successfully send a message and create new conversation", async () => {
      const mockConversation = {
        id: "new-conversation-id",
        userId: "test-user-id",
        practiceLevel: "B1",
        conversationType: "general",
      };

      mockGenerateText.mockImplementation(() => {
        return Promise.resolve({
          text: "Hello! I'm here to help you practice English. What would you like to talk about?"
        });
      });
      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.message.createMany.mockResolvedValue({ count: 2 });

      const request = {
        message: "Hello, I want to practice English",
        practiceLevel: "B1" as const,
        conversationType: "general",
        userId: "test-user-id",
      };

      const result = await ChatService.sendMessage(request);

      expect(result).toEqual({
        response: "Hello! I'm here to help you practice English. What would you like to talk about?",
        conversationId: "new-conversation-id",
        timestamp: expect.any(String),
      });

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: "deepseek-model-instance",
        prompt: expect.stringContaining("intermediate learners (B1 level)"),
        temperature: 0.7,
        maxTokens: 500
      });

      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          userId: "test-user-id",
          practiceLevel: "B1",
          conversationType: "general",
        },
      });

      expect(mockPrisma.message.createMany).toHaveBeenCalledWith({
        data: [
          {
            conversationId: "new-conversation-id",
            role: "USER",
            content: "Hello, I want to practice English",
            timestamp: expect.any(Date),
          },
          {
            conversationId: "new-conversation-id",
            role: "ASSISTANT",
            content: "Hello! I'm here to help you practice English. What would you like to talk about?",
            timestamp: expect.any(Date),
          },
        ],
      });
    });

    it("should continue existing conversation", async () => {
      const mockExistingConversation = {
        id: "existing-conversation-id",
        userId: "test-user-id",
      };

      mockGenerateText.mockImplementation(() => {
        return Promise.resolve({
          text: "That's great! Keep practicing and you'll improve."
        });
      });
      mockPrisma.conversation.findUnique.mockResolvedValue(mockExistingConversation);
      mockPrisma.message.createMany.mockResolvedValue({ count: 2 });

      const request = {
        message: "I'm getting better at English",
        practiceLevel: "A2" as const,
        conversationId: "existing-conversation-id",
        userId: "test-user-id",
        conversationContext: [
          { role: "assistant" as const, content: "How is your English practice going?" },
        ],
      };

      const result = await ChatService.sendMessage(request);

      expect(result.conversationId).toBe("existing-conversation-id");
      expect(result.response).toBe("That's great! Keep practicing and you'll improve.");

      expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: "existing-conversation-id", userId: "test-user-id" },
      });

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: "deepseek-model-instance",
        prompt: expect.stringContaining("upper-intermediate learners (B2 level)"),
        temperature: 0.7,
        maxTokens: 500
      });
    });

    it("should handle DeepSeek API errors", async () => {
      // Create an error with status property to simulate API rate limit error
      const deepseekError = new Error("API Error");
      (deepseekError as any).status = 429;

      // Mock the generateText function to reject with our error
      mockGenerateText.mockImplementation(() => Promise.reject(deepseekError));

      const request = {
        message: "Hello",
        practiceLevel: "A1" as const,
        userId: "test-user-id",
      };

      await expect(ChatService.sendMessage(request)).rejects.toThrow(
        "DeepSeek API rate limit exceeded. Please try again later."
      );
    });

    it("should handle conversation not found error", async () => {
      // Mock the transaction to throw the expected error
      mockPrisma.$transaction = jest.fn().mockImplementation(async () => {
        throw new Error("Conversation not found or unauthorized");
      });
      
      // Set up the generateText mock to succeed so we get to the transaction
      mockGenerateText.mockImplementation(() => {
        return Promise.resolve({
          text: "Test response"
        });
      });

      const request = {
        message: "Hello",
        practiceLevel: "A1" as const,
        conversationId: "non-existent-id",
        userId: "test-user-id",
      };

      await expect(ChatService.sendMessage(request)).rejects.toThrow(
        "Conversation not found or unauthorized"
      );
    });

    it("should generate appropriate system prompts for different levels", async () => {
      // Set up the mock to return a successful response
      mockGenerateText.mockImplementation(() => {
        return Promise.resolve({
          text: "Test response for B1 level"
        });
      });
      
      // Send a message with B1 level
      const request = {
        message: "Hello",
        practiceLevel: "B1" as const,
        userId: "test-user-id",
      };
      
      // Mock transaction for new conversation
      mockPrisma.$transaction = jest.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });
      mockPrisma.conversation.create.mockResolvedValue({ id: "new-id" });
      mockPrisma.message.createMany.mockResolvedValue({ count: 2 });
      
      await ChatService.sendMessage(request);
      
      // Verify the prompt contains the correct system prompt for B1 level
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("intermediate learners (B1 level)")
        })
      );
      
      // Access the private method through any
      const service = ChatService as any;
      const a1Prompt = service.getPracticeLevelSystemPrompt("A1");
      const c2Prompt = service.getPracticeLevelSystemPrompt("C2");

      expect(a1Prompt).toContain("beginners (A1 level)");
      expect(a1Prompt).toContain("simple vocabulary");
      
      expect(c2Prompt).toContain("proficient speakers (C2 level)");
      expect(c2Prompt).toContain("native-level language");
    });
  });

  describe("getConversationHistory", () => {
    it("should retrieve conversation history successfully", async () => {
      const mockConversation = {
        id: "test-conversation-id",
        userId: "test-user-id",
        messages: [
          { id: "msg1", role: "USER", content: "Hello", timestamp: new Date() },
          { id: "msg2", role: "ASSISTANT", content: "Hi!", timestamp: new Date() },
        ],
      };

      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);

      const result = await ChatService.getConversationHistory("test-conversation-id", "test-user-id");

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
        where: {
          id: "test-conversation-id",
          userId: "test-user-id",
        },
        include: {
          messages: {
            orderBy: {
              timestamp: "asc",
            },
          },
        },
      });
    });

    it("should handle conversation not found", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        ChatService.getConversationHistory("non-existent-id", "test-user-id")
      ).rejects.toThrow("Conversation not found or unauthorized");
    });
  });

  describe("getUserConversations", () => {
    it("should retrieve user conversations successfully", async () => {
      const mockConversations = [
        {
          id: "conv1",
          userId: "test-user-id",
          messages: [{ content: "Latest message" }],
        },
        {
          id: "conv2",
          userId: "test-user-id",
          messages: [{ content: "Another message" }],
        },
      ];

      mockPrisma.conversation.findMany.mockResolvedValue(mockConversations);

      const result = await ChatService.getUserConversations("test-user-id");

      expect(result).toEqual(mockConversations);
      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: {
          userId: "test-user-id",
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
    });
  });
});
