import request from "supertest";
import express from "express";
import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import { sendMessage, getConversationHistory, getUserConversations } from "../../src/controllers/chat.controller";
import ChatService from "../../src/services/chat.service";
import UserService from "../../src/services/user.service";
import Jwt from "../../src/utils/security/jwt";

const prisma = new PrismaClient();

jest.mock("../../src/services/chat.service");
const mockChatService = ChatService as jest.Mocked<typeof ChatService>;

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  const mockAuth = (req: any, res: any, next: any) => {
    req.user = {
      id: "test-user-id",
      email: "test@example.com",
    };
    next();
  };

  app.post("/chat/ai", mockAuth, sendMessage);
  app.get("/chat/conversations/:conversationId", mockAuth, getConversationHistory);
  app.get("/chat/conversations", mockAuth, getUserConversations);

  return app;
};

describe("Chat Endpoints", () => {
  let app: any;
  let createdUsers: string[] = [];
  let createdConversations: string[] = [];

  beforeEach(() => {
    app = createTestApp();
    createdUsers = [];
    createdConversations = [];
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (createdConversations.length > 0) {
      await prisma.message.deleteMany({
        where: {
          conversationId: {
            in: createdConversations,
          },
        },
      });
      await prisma.conversation.deleteMany({
        where: {
          id: {
            in: createdConversations,
          },
        },
      });
    }

    if (createdUsers.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUsers,
          },
        },
      });
    }
  });

  describe("POST /chat/ai", () => {
    it("should successfully send a message and get AI response", async () => {
      const mockResponse = {
        response: "Hello! How can I help you practice English today?",
        conversationId: "test-conversation-id",
        timestamp: new Date().toISOString(),
      };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      const requestData = {
        message: "Hello, I want to practice English",
        practiceLevel: "B1",
        conversationType: "general",
      };

      const response = await request(app)
        .post("/chat/ai")
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Chat response generated successfully");
      expect(response.body.data).toEqual(mockResponse);
      expect(mockChatService.sendMessage).toHaveBeenCalledWith({
        message: requestData.message,
        practiceLevel: requestData.practiceLevel,
        conversationType: requestData.conversationType,
        conversationContext: undefined,
        conversationId: undefined,
        userId: "test-user-id",
      });
    });

    it("should handle missing required fields", async () => {
      const requestData = {
        practiceLevel: "B1",
      };

      const response = await request(app)
        .post("/chat/ai")
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Message and practice level are required");
    });

    it("should handle service errors", async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error("OpenAI API error"));

      const requestData = {
        message: "Hello",
        practiceLevel: "A1",
      };

      const response = await request(app)
        .post("/chat/ai")
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("OpenAI API error");
    });

    it("should send message with conversation context", async () => {
      const mockResponse = {
        response: "That's great! What would you like to talk about?",
        conversationId: "existing-conversation-id",
        timestamp: new Date().toISOString(),
      };

      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      const requestData = {
        message: "I'm doing well, thank you",
        practiceLevel: "B2",
        conversationId: "existing-conversation-id",
        conversationContext: [
          { role: "assistant", content: "Hello! How are you today?" },
          { role: "user", content: "Hi there!" },
        ],
      };

      const response = await request(app)
        .post("/chat/ai")
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockResponse);
      expect(mockChatService.sendMessage).toHaveBeenCalledWith({
        ...requestData,
        userId: "test-user-id",
      });
    });
  });

  describe("GET /chat/conversations/:conversationId", () => {
    it("should retrieve conversation history successfully", async () => {
      const mockConversation = {
        id: "test-conversation-id",
        userId: "test-user-id",
        practiceLevel: "B1",
        conversationType: "general",
        messages: [
          { id: "msg1", role: "USER", content: "Hello", timestamp: new Date() },
          { id: "msg2", role: "ASSISTANT", content: "Hi there!", timestamp: new Date() },
        ],
      };

      mockChatService.getConversationHistory.mockResolvedValue(mockConversation as any);

      const response = await request(app)
        .get("/chat/conversations/test-conversation-id");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Conversation history retrieved successfully");
      expect(response.body.data).toEqual(mockConversation);
      expect(mockChatService.getConversationHistory).toHaveBeenCalledWith(
        "test-conversation-id",
        "test-user-id"
      );
    });

    it("should handle conversation not found", async () => {
      mockChatService.getConversationHistory.mockRejectedValue(
        new Error("Conversation not found or unauthorized")
      );

      const response = await request(app)
        .get("/chat/conversations/non-existent-id");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Conversation not found or unauthorized");
    });
  });

  describe("GET /chat/conversations", () => {
    it("should retrieve user conversations successfully", async () => {
      const mockConversations = [
        {
          id: "conv1",
          userId: "test-user-id",
          practiceLevel: "B1",
          conversationType: "general",
          messages: [{ id: "msg1", content: "Latest message", timestamp: new Date() }],
        },
        {
          id: "conv2",
          userId: "test-user-id",
          practiceLevel: "A2",
          conversationType: "business",
          messages: [{ id: "msg2", content: "Another message", timestamp: new Date() }],
        },
      ];

      mockChatService.getUserConversations.mockResolvedValue(mockConversations as any);

      const response = await request(app)
        .get("/chat/conversations");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User conversations retrieved successfully");
      expect(response.body.data).toEqual(mockConversations);
      expect(mockChatService.getUserConversations).toHaveBeenCalledWith("test-user-id");
    });

    it("should handle service errors", async () => {
      mockChatService.getUserConversations.mockRejectedValue(
        new Error("Database connection error")
      );

      const response = await request(app)
        .get("/chat/conversations");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Database connection error");
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});