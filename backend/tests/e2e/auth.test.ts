const request = require("supertest");
const express = require("express");
const { faker } = require("@faker-js/faker");

import {
  register,
  login,
  verifyEmail,
} from "../../src/controllers/auth.controller";
import UserService from "../../src/services/user.service";
import Bcrypt from "../../src/utils/security/bcrypt";
import Jwt from "../../src/utils/security/jwt";
import { PrismaClient } from "@prisma/client";
import { generateUniqueWalletAddress } from "../helpers/testUtils";

// Create a Prisma client for cleanup
const prisma = new PrismaClient();

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Set up routes
  app.post("/register", register);
  app.post("/login", login);
  app.get("/verify-email", verifyEmail);

  return app;
};

describe("Authentication Endpoints", () => {
  let app: any;
  let createdUsers: string[] = [];
  let createdWallets: string[] = [];

  beforeEach(() => {
    app = createTestApp();
    createdUsers = [];
    createdWallets = [];
  });

  afterEach(async () => {
    // Clean up created wallets
    if (createdWallets.length > 0) {
      await prisma.wallet.deleteMany({
        where: {
          id: {
            in: createdWallets,
          },
        },
      });
    }

    // Clean up created users
    if (createdUsers.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUsers,
          },
        },
      });
    }

    // Clean up any verification challenges
    await prisma.walletVerificationChallenge.deleteMany();
  });

  // Modify the registration test to track created users
  describe("POST /register", () => {
    it("should successfully register a new user", async () => {
      const userData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateUniqueWalletAddress(),
      };

      const response = await request(app).post("/register").send(userData);

      // Track the created user
      const createdUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (createdUser) {
        createdUsers.push(createdUser.id);

        // Also track the associated wallet if it exists
        const createdWallet = await prisma.wallet.findUnique({
          where: { userId: createdUser.id },
        });

        if (createdWallet) {
          createdWallets.push(createdWallet.id);
        }
      }

      expect(response.status).toBe(200);
      expect(response.body.data.user).toHaveProperty("email", userData.email);
      expect(response.body.data.user).not.toHaveProperty("password");
    });
  });

  // Similar approach for verify email tests
  describe("GET /verify-email", () => {
    it("should verify email with valid token", async () => {
      // Create a user
      const user = await UserService.registerUser({
        email: faker.internet.email(),
        hashedPassword: await Bcrypt.hashPassword("password"),
        firstName: "Test",
        lastName: "User",
        walletAddress: generateUniqueWalletAddress(),
      });

      // Track the created user
      if (user) {
        createdUsers.push(user.id);
      }

      // Generate a verification token
      const verificationToken = Jwt.issue({ userId: user.id }, "1d");

      const response = await request(app).get(
        `/verify-email?token=${verificationToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email verified successfully");
    });

    // Other tests remain similar
  });

  // Modify the login test to track created users
  describe("POST /login", () => {
    it("should successfully log in a user with valid credentials", async () => {
      const userData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateUniqueWalletAddress(),
      };

      // Register the user first
      await request(app).post("/register").send(userData);

      // Verify the email
      const createdUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (createdUser) {
        createdUsers.push(createdUser.id);
        const verificationToken = Jwt.issue({ userId: createdUser.id }, "1d");
        await request(app).get(`/verify-email?token=${verificationToken}`);
      }

      // Attempt to log in
      const response = await request(app).post("/login").send({
        email: userData.email,
        password: userData.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user).toHaveProperty("email", userData.email);
      expect(response.body.data.user).not.toHaveProperty("password");
    });
  });

  // Optional: Add a global afterAll to ensure complete cleanup
  afterAll(async () => {
    await prisma.$disconnect();
  });
});
