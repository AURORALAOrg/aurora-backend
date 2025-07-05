import request from "supertest"
import app from "../../src/app"
import { PrismaClient } from "@prisma/client"
import Jwt from "../../src/utils/security/jwt"

// Mock OpenAI globally for e2e tests
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

const prisma = new PrismaClient()

describe("Chat API Endpoints", () => {
  let authToken: string
  let userId: string

  beforeAll(async () => {
    // Create a test user and get auth token
    const testUser = await prisma.user.create({
      data: {
        email: "chattest@example.com",
        password: "hashedpassword",
        firstName: "Chat",
        lastName: "Test",
        isEmailVerified: true,
      },
    })

    userId = testUser.id
    authToken = Jwt.issue({ id: testUser.id, email: testUser.email }, "1h")
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  describe("POST /api/v1/chat/ai", () => {
    it("should generate AI chat response for authenticated user", async () => {
      const response = await request(app).post("/api/v1/chat/ai").set("Authorization", `Bearer ${authToken}`).send({
        message: "Hello, I want to practice English conversation",
        practiceLevel: "B1",
        conversationType: "general",
        conversationContext: [],
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("response")
      expect(response.body.data).toHaveProperty("conversationId")
      expect(response.body.data).toHaveProperty("timestamp")
      expect(response.body.data.practiceLevel).toBe("B1")
    })

    it("should reject request without authentication", async () => {
      const response = await request(app).post("/api/v1/chat/ai").send({
        message: "Hello",
        practiceLevel: "B1",
      })

      expect(response.status).toBe(401)
    })

    it("should validate required fields", async () => {
      const response = await request(app).post("/api/v1/chat/ai").set("Authorization", `Bearer ${authToken}`).send({
        // Missing required fields
      })

      expect(response.status).toBe(400)
    })

    it("should validate practice level", async () => {
      const response = await request(app).post("/api/v1/chat/ai").set("Authorization", `Bearer ${authToken}`).send({
        message: "Hello",
        practiceLevel: "INVALID",
        conversationType: "general",
      })

      expect(response.status).toBe(400)
    })
  })

  describe("GET /api/v1/chat/starters", () => {
    it("should return conversation starters for authenticated user", async () => {
      const response = await request(app)
        .get("/api/v1/chat/starters")
        .set("Authorization", `Bearer ${authToken}`)
        .query({
          practiceLevel: "B1",
          conversationType: "general",
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("starters")
      expect(Array.isArray(response.body.data.starters)).toBe(true)
    })

    it("should reject request without authentication", async () => {
      const response = await request(app).get("/api/v1/chat/starters")

      expect(response.status).toBe(401)
    })
  })

  describe("GET /api/v1/chat/health", () => {
    it("should return health status without authentication", async () => {
      const response = await request(app).get("/api/v1/chat/health")

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("status", "healthy")
    })
  })

  describe("Rate Limiting", () => {
    it("should enforce rate limits on chat endpoints", async () => {
      // Make multiple requests quickly to trigger rate limit
      const requests = Array(25)
        .fill(null)
        .map(() =>
          request(app).post("/api/v1/chat/ai").set("Authorization", `Bearer ${authToken}`).send({
            message: "Test message",
            practiceLevel: "B1",
            conversationType: "general",
          }),
        )

      const responses = await Promise.all(requests)

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter((res) => res.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })
})

