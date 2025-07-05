import ChatService from "../../src/services/chat.service"
import { ChatRequest } from "../../src/models/interfaces/chat.interfaces"

// Mock OpenAI
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: "Hello! I'd be happy to help you practice English conversation.",
                },
              },
            ],
            usage: {
              prompt_tokens: 50,
              completion_tokens: 20,
              total_tokens: 70,
            },
          }),
        },
      },
    })),
  }
})

describe("ChatService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("generateChatResponse", () => {
    it("should generate a chat response successfully", async () => {
      const request: ChatRequest = {
        message: "Hello, I want to practice English",
        conversationContext: [],
        practiceLevel: "B1",
        conversationType: "general",
        userLanguage: "en",
      }

      const response = await ChatService.generateChatResponse(request)

      expect(response).toHaveProperty("response")
      expect(response).toHaveProperty("conversationId")
      expect(response).toHaveProperty("usage")
      expect(response.response).toBe("Hello! I'd be happy to help you practice English conversation.")
      expect(response.usage).toBeDefined()
      expect(response.usage?.totalTokens).toBe(70)
    })

    it("should handle conversation context", async () => {
      const request: ChatRequest = {
        message: "How are you?",
        conversationContext: [
          {
            role: "user",
            content: "Hello",
            timestamp: new Date(),
          },
          {
            role: "assistant",
            content: "Hi there! How can I help you practice English today?",
            timestamp: new Date(),
          },
        ],
        practiceLevel: "A2",
        conversationType: "casual",
        userLanguage: "es",
      }

      const response = await ChatService.generateChatResponse(request)

      expect(response).toHaveProperty("response")
      expect(response).toHaveProperty("conversationId")
      expect(response).toHaveProperty("usage")
    })
  })

  describe("validateConversationContext", () => {
    it("should validate correct conversation context", () => {
      const context = [
        {
          role: "user" as const,
          content: "Hello",
          timestamp: new Date(),
        },
        {
          role: "assistant" as const,
          content: "Hi there!",
          timestamp: new Date(),
        },
      ]

      const isValid = ChatService.validateConversationContext(context)
      expect(isValid).toBe(true)
    })

    it("should reject invalid conversation context", () => {
      const context = [
        {
          role: "invalid_role",
          content: "Hello",
        },
      ] as any

      const isValid = ChatService.validateConversationContext(context)
      expect(isValid).toBe(false)
    })
  })

  describe("getConversationStarters", () => {
    it("should return conversation starters for A1 general", () => {
      const starters = ChatService.getConversationStarters("A1", "general")

      expect(Array.isArray(starters)).toBe(true)
      expect(starters.length).toBeGreaterThan(0)
      expect(starters).toContain("Hello! How are you today?")
    })

    it("should return conversation starters for B1 business", () => {
      const starters = ChatService.getConversationStarters("B1", "business")

      expect(Array.isArray(starters)).toBe(true)
      expect(starters.length).toBeGreaterThan(0)
    })

    it("should fallback to A1 general for unknown combinations", () => {
      const starters = ChatService.getConversationStarters("X1", "unknown")

      expect(Array.isArray(starters)).toBe(true)
      expect(starters).toContain("Hello! How are you today?")
    })
  })
})
