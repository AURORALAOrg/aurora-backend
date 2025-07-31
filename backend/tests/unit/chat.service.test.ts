import { PrismaClient } from "@prisma/client";

const mockOpenAIInstance = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => mockOpenAIInstance);
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
  openai: {
    apiKey: "test-api-key",
    model: "gpt-3.5-turbo",
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
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: "Hello! I'm here to help you practice English. What would you like to talk about?",
            },
          },
        ],
      };

      const mockConversation = {
        id: "new-conversation-id",
        userId: "test-user-id",
        practiceLevel: "B1",
        conversationType: "general",
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
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

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: expect.stringContaining("intermediate learners (B1 level)"),
          },
          {
            role: "user",
            content: "Hello, I want to practice English",
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
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
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: "That's great! Keep practicing and you'll improve.",
            },
          },
        ],
      };

      const mockExistingConversation = {
        id: "existing-conversation-id",
        userId: "test-user-id",
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
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

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: expect.stringContaining("elementary learners (A2 level)"),
          },
          {
            role: "assistant",
            content: "How is your English practice going?",
          },
          {
            role: "user",
            content: "I'm getting better at English",
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });
    });

    it("should handle OpenAI API errors", async () => {
      const openAIError = new Error("API Error");
      (openAIError as any).status = 429;

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(openAIError);

      const request = {
        message: "Hello",
        practiceLevel: "A1" as const,
        userId: "test-user-id",
      };

      await expect(ChatService.sendMessage(request)).rejects.toThrow(
        "OpenAI API rate limit exceeded. Please try again later."
      );
    });

    it("should handle conversation not found error", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

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

    it("should generate appropriate system prompts for different levels", () => {
      const service = new (ChatService.constructor as any)();
      
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