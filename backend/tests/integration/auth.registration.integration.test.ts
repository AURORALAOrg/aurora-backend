import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import request from "supertest";
import express from "express";
import { register } from "../../src/controllers/auth.controller";
import EmailNotifier from "../../src/utils/service/emailNotifier";
import logger from "../../src/core/config/logger";
import validateRequest from "../../src/middlewares/validator";
import { registerValidation } from "../../src/models/validations/auth.validators";
import errorHandler from "../../src/middlewares/errorHandler";
import { Keypair } from "@stellar/stellar-sdk";
import { generateUniqueWalletAddress } from "../helpers/testUtils";

// Create a Prisma client for testing
const prisma = new PrismaClient();

// Helper function to generate valid Stellar wallet addresses (use the shared helper)
const generateValidWalletAddress = generateUniqueWalletAddress;

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Set up the register route with proper validation
  app.post("/register", validateRequest(registerValidation), register);

  // Error handling middleware
  app.use(errorHandler);

  return app;
};

// Mock EmailNotifier to control email behavior in tests
jest.mock("../../src/utils/service/emailNotifier");
const mockEmailNotifier = EmailNotifier as jest.Mocked<typeof EmailNotifier>;

// Mock logger to avoid console noise during tests
jest.mock("../../src/core/config/logger", () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("Registration Flow Integration Tests", () => {
  let app: express.Application;
  let createdUserIds: string[] = [];
  let createdWalletIds: string[] = [];

  beforeAll(async () => {
    // Ensure database connection is working
    await prisma.$connect();
  });

  beforeEach(async () => {
    app = createTestApp();
    createdUserIds = [];
    createdWalletIds = [];

    // Reset all mocks
    jest.clearAllMocks();

    // Default mock behavior - email succeeds
    mockEmailNotifier.sendAccountActivationEmail.mockResolvedValue(undefined);

    // Clean up any orphaned data from previous test runs
    try {
      await prisma.walletVerificationChallenge.deleteMany();
      // Remove any users without wallets (orphaned records)
      const orphanedUsers = await prisma.user.findMany({
        where: {
          wallet: null,
        },
      });
      if (orphanedUsers.length > 0) {
        await prisma.user.deleteMany({
          where: {
            id: {
              in: orphanedUsers.map((u) => u.id),
            },
          },
        });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up created wallets first (due to foreign key constraints)
    if (createdWalletIds.length > 0) {
      await prisma.wallet.deleteMany({
        where: {
          id: {
            in: createdWalletIds,
          },
        },
      });
    }

    // Clean up created users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }

    // Clean up any verification challenges
    try {
      await prisma.walletVerificationChallenge.deleteMany();
    } catch (error) {
      // Table might not exist in test environment, ignore
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Complete Registration Flow with Database State Verification", () => {
    it("should successfully complete full registration flow and verify database state", async () => {
      // Arrange
      const userData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      // Act
      const response = await request(app)
        .post("/register")
        .send(userData)
        .expect(200);

      // Assert API response
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Registration successful. Please verify your email."
      );
      expect(response.body.data.user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isEmailVerified: false,
      });
      expect(response.body.data.user).not.toHaveProperty("password");

      // Track created user for cleanup
      const userId = response.body.data.user.id;
      createdUserIds.push(userId);

      // Verify database state - User
      const createdUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(userData.email);
      expect(createdUser?.firstName).toBe(userData.firstName);
      expect(createdUser?.lastName).toBe(userData.lastName);
      expect(createdUser?.isEmailVerified).toBe(false);
      expect(createdUser?.password).toBeDefined(); // Password should be hashed and stored

      // Verify database state - Wallet
      expect(createdUser?.wallet).toBeDefined();
      expect(createdUser?.wallet?.walletAddress).toBe(userData.walletAddress);
      expect(createdUser?.wallet?.isVerified).toBe(false);
      expect(createdUser?.wallet?.userId).toBe(userId);

      // Track wallet for cleanup
      if (createdUser?.wallet) {
        createdWalletIds.push(createdUser.wallet.id);
      }

      // Verify referential integrity
      const walletFromDb = await prisma.wallet.findUnique({
        where: { userId: userId },
        include: { user: true },
      });

      expect(walletFromDb).toBeDefined();
      expect(walletFromDb?.user.id).toBe(userId);
      expect(walletFromDb?.user.email).toBe(userData.email);

      // Verify email notification was called
      expect(
        mockEmailNotifier.sendAccountActivationEmail
      ).toHaveBeenCalledTimes(1);
      expect(mockEmailNotifier.sendAccountActivationEmail).toHaveBeenCalledWith(
        userData.email,
        expect.stringContaining("/verify-email?token=")
      );
    });

    it("should maintain data consistency across multiple successful registrations", async () => {
      // Arrange - Multiple users
      const users = [
        {
          email: faker.internet.email(),
          password: "StrongPassword123!",
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          walletAddress: generateValidWalletAddress(),
        },
        {
          email: faker.internet.email(),
          password: "StrongPassword456!",
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          walletAddress: generateValidWalletAddress(),
        },
        {
          email: faker.internet.email(),
          password: "StrongPassword789!",
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          walletAddress: generateValidWalletAddress(),
        },
      ];

      // Act - Register all users
      const responses = await Promise.all(
        users.map((userData) =>
          request(app).post("/register").send(userData).expect(200)
        )
      );

      // Track all created users for cleanup
      responses.forEach((response) => {
        createdUserIds.push(response.body.data.user.id);
      });

      // Assert - Verify all users and wallets were created correctly
      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const response = responses[i];
        const userId = response.body.data.user.id;

        // Verify user in database
        const userFromDb = await prisma.user.findUnique({
          where: { id: userId },
          include: { wallet: true },
        });

        expect(userFromDb).toBeDefined();
        expect(userFromDb?.email).toBe(userData.email);
        expect(userFromDb?.wallet?.walletAddress).toBe(userData.walletAddress);

        // Track wallet for cleanup
        if (userFromDb?.wallet) {
          createdWalletIds.push(userFromDb.wallet.id);
        }
      }

      // Verify total counts
      const totalUsers = await prisma.user.count({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
      expect(totalUsers).toBe(3);

      const totalWallets = await prisma.wallet.count({
        where: {
          userId: {
            in: createdUserIds,
          },
        },
      });
      expect(totalWallets).toBe(3);

      // Verify email notifications were sent for all users
      expect(
        mockEmailNotifier.sendAccountActivationEmail
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe("Concurrent Registration Attempts", () => {
    it("should handle concurrent registration attempts with same email gracefully", async () => {
      // Arrange
      const userData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      const duplicateUserData = {
        ...userData,
        password: "DifferentPassword456!",
        firstName: "Different",
        lastName: "Name",
        walletAddress: generateValidWalletAddress(),
      };

      // Act - Attempt concurrent registrations
      const [response1, response2] = await Promise.allSettled([
        request(app).post("/register").send(userData),
        request(app).post("/register").send(duplicateUserData),
      ]);

      // Assert - One should succeed, one should fail
      const responses = [response1, response2];
      const successfulResponses = responses.filter(
        (r) => r.status === "fulfilled" && r.value.status === 200
      );
      const failedResponses = responses.filter(
        (r) => r.status === "fulfilled" && r.value.status !== 200
      );

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(1);

      // Track successful user for cleanup
      if (successfulResponses.length > 0) {
        const successResponse = successfulResponses[0] as any;
        createdUserIds.push(successResponse.value.body.data.user.id);
      }

      // Verify only one user exists with that email
      const usersWithEmail = await prisma.user.findMany({
        where: { email: userData.email },
      });
      expect(usersWithEmail).toHaveLength(1);

      // Track wallet for cleanup
      const wallet = await prisma.wallet.findUnique({
        where: { userId: usersWithEmail[0].id },
      });
      if (wallet) {
        createdWalletIds.push(wallet.id);
      }

      // Verify no orphaned data
      const totalUsers = await prisma.user.count({
        where: { email: userData.email },
      });
      const totalWallets = await prisma.wallet.count({
        where: { userId: usersWithEmail[0].id },
      });
      expect(totalUsers).toBe(1);
      expect(totalWallets).toBe(1);
    });

    it("should handle concurrent registration attempts with same wallet address gracefully", async () => {
      // Arrange
      const sharedWalletAddress = generateValidWalletAddress();

      const userData1 = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: sharedWalletAddress,
      };

      const userData2 = {
        email: faker.internet.email(),
        password: "StrongPassword456!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: sharedWalletAddress, // Same wallet address
      };

      // Act - Attempt concurrent registrations
      const [response1, response2] = await Promise.allSettled([
        request(app).post("/register").send(userData1),
        request(app).post("/register").send(userData2),
      ]);

      // Assert - One should succeed, one should fail
      const responses = [response1, response2];
      const successfulResponses = responses.filter(
        (r) => r.status === "fulfilled" && r.value.status === 200
      );
      const failedResponses = responses.filter(
        (r) => r.status === "fulfilled" && r.value.status !== 200
      );

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(1);

      // Track successful user for cleanup
      if (successfulResponses.length > 0) {
        const successResponse = successfulResponses[0] as any;
        createdUserIds.push(successResponse.value.body.data.user.id);
      }

      // Verify only one wallet exists with that address
      const walletsWithAddress = await prisma.wallet.findMany({
        where: { walletAddress: sharedWalletAddress },
      });
      expect(walletsWithAddress).toHaveLength(1);

      // Track wallet for cleanup
      if (walletsWithAddress.length > 0) {
        createdWalletIds.push(walletsWithAddress[0].id);
      }

      // Verify no orphaned users
      const allUsers = await prisma.user.findMany({
        include: { wallet: true },
      });
      const usersWithoutWallets = allUsers.filter((user) => !user.wallet);
      expect(usersWithoutWallets).toHaveLength(0);
    });
  });

  describe("Email Notification Timing and Failure Handling", () => {
    it("should send email notification only after successful transaction completion", async () => {
      // Arrange
      const userData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      // Act
      const response = await request(app)
        .post("/register")
        .send(userData)
        .expect(200);

      // Track created user for cleanup
      createdUserIds.push(response.body.data.user.id);

      // Assert - Email should be called after successful registration
      expect(
        mockEmailNotifier.sendAccountActivationEmail
      ).toHaveBeenCalledTimes(1);
      expect(mockEmailNotifier.sendAccountActivationEmail).toHaveBeenCalledWith(
        userData.email,
        expect.stringContaining("/verify-email?token=")
      );

      // Verify user and wallet exist in database
      const userFromDb = await prisma.user.findUnique({
        where: { email: userData.email },
        include: { wallet: true },
      });

      expect(userFromDb).toBeDefined();
      expect(userFromDb?.wallet).toBeDefined();

      // Track wallet for cleanup
      if (userFromDb?.wallet) {
        createdWalletIds.push(userFromDb.wallet.id);
      }
    });

    it("should not send email notification when transaction fails", async () => {
      // Arrange - Create a user first to cause duplicate email error
      const existingUserData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      // Create first user successfully
      const firstResponse = await request(app)
        .post("/register")
        .send(existingUserData)
        .expect(200);

      createdUserIds.push(firstResponse.body.data.user.id);

      // Track first user's wallet for cleanup
      const firstWallet = await prisma.wallet.findUnique({
        where: { userId: firstResponse.body.data.user.id },
      });
      if (firstWallet) {
        createdWalletIds.push(firstWallet.id);
      }

      // Reset email mock call count
      jest.clearAllMocks();

      // Arrange - Try to create duplicate user
      const duplicateUserData = {
        email: existingUserData.email, // Same email
        password: "DifferentPassword456!",
        firstName: "Different",
        lastName: "Name",
        walletAddress: generateValidWalletAddress(),
      };

      // Act - Attempt registration with duplicate email
      await request(app).post("/register").send(duplicateUserData).expect(400); // Should fail

      // Assert - No email should be sent for failed registration
      expect(
        mockEmailNotifier.sendAccountActivationEmail
      ).not.toHaveBeenCalled();

      // Verify no additional user was created
      const usersWithEmail = await prisma.user.findMany({
        where: { email: existingUserData.email },
      });
      expect(usersWithEmail).toHaveLength(1);
    });

    it("should complete registration successfully even when email notification fails", async () => {
      // Arrange - Mock email to fail
      mockEmailNotifier.sendAccountActivationEmail.mockRejectedValue(
        new Error("Email service unavailable")
      );

      const userData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      // Act - Registration should still succeed
      const response = await request(app)
        .post("/register")
        .send(userData)
        .expect(200);

      // Track created user for cleanup
      createdUserIds.push(response.body.data.user.id);

      // Assert - Registration should be successful despite email failure
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Registration successful. Please verify your email."
      );

      // Verify user and wallet were created in database
      const userFromDb = await prisma.user.findUnique({
        where: { email: userData.email },
        include: { wallet: true },
      });

      expect(userFromDb).toBeDefined();
      expect(userFromDb?.wallet).toBeDefined();

      // Track wallet for cleanup
      if (userFromDb?.wallet) {
        createdWalletIds.push(userFromDb.wallet.id);
      }

      // Verify email was attempted
      expect(
        mockEmailNotifier.sendAccountActivationEmail
      ).toHaveBeenCalledTimes(1);

      // Verify error was logged (check that logger.error was called)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send activation email"),
        expect.any(Object)
      );
    });
  });

  describe("Transaction Rollback and Orphaned Data Prevention", () => {
    it("should ensure no orphaned data exists after user creation failure", async () => {
      // Arrange - Create a user first
      const existingUserData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      const firstResponse = await request(app)
        .post("/register")
        .send(existingUserData)
        .expect(200);

      createdUserIds.push(firstResponse.body.data.user.id);

      // Track first user's wallet for cleanup
      const firstWallet = await prisma.wallet.findUnique({
        where: { userId: firstResponse.body.data.user.id },
      });
      if (firstWallet) {
        createdWalletIds.push(firstWallet.id);
      }

      // Get initial counts
      const initialUserCount = await prisma.user.count();
      const initialWalletCount = await prisma.wallet.count();

      // Arrange - Try to create user with duplicate email
      const duplicateUserData = {
        email: existingUserData.email, // Same email - will cause failure
        password: "DifferentPassword456!",
        firstName: "Different",
        lastName: "Name",
        walletAddress: generateValidWalletAddress(),
      };

      // Act - Attempt registration (should fail)
      await request(app).post("/register").send(duplicateUserData).expect(400);

      // Assert - No additional data should be created
      const finalUserCount = await prisma.user.count();
      const finalWalletCount = await prisma.wallet.count();

      expect(finalUserCount).toBe(initialUserCount);
      expect(finalWalletCount).toBe(initialWalletCount);

      // Verify no orphaned wallets exist (wallets without corresponding users)
      const allWallets = await prisma.wallet.findMany({
        include: { user: true },
      });
      const orphanedWallets = allWallets.filter((wallet) => !wallet.user);
      expect(orphanedWallets).toHaveLength(0);

      // Verify only one user exists with that email (the original one)
      const usersWithEmail = await prisma.user.findMany({
        where: { email: duplicateUserData.email },
      });
      expect(usersWithEmail).toHaveLength(1);
      expect(usersWithEmail[0].id).toBe(firstResponse.body.data.user.id);
    });

    it("should ensure no orphaned data exists after wallet creation failure", async () => {
      // Arrange - Create a user with wallet first
      const existingUserData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      const firstResponse = await request(app)
        .post("/register")
        .send(existingUserData)
        .expect(200);

      createdUserIds.push(firstResponse.body.data.user.id);

      // Track first user's wallet for cleanup
      const firstWallet = await prisma.wallet.findUnique({
        where: { userId: firstResponse.body.data.user.id },
      });
      if (firstWallet) {
        createdWalletIds.push(firstWallet.id);
      }

      // Get initial counts
      const initialUserCount = await prisma.user.count();
      const initialWalletCount = await prisma.wallet.count();

      // Arrange - Try to create user with duplicate wallet address
      const duplicateWalletUserData = {
        email: faker.internet.email(), // Different email
        password: "DifferentPassword456!",
        firstName: "Different",
        lastName: "Name",
        walletAddress: existingUserData.walletAddress, // Same wallet address - will cause failure
      };

      // Act - Attempt registration (should fail due to duplicate wallet)
      await request(app)
        .post("/register")
        .send(duplicateWalletUserData)
        .expect(400);

      // Assert - No additional data should be created
      const finalUserCount = await prisma.user.count();
      const finalWalletCount = await prisma.wallet.count();

      expect(finalUserCount).toBe(initialUserCount);
      expect(finalWalletCount).toBe(initialWalletCount);

      // Verify no orphaned users exist (users without wallets)
      const allUsers = await prisma.user.findMany({
        include: { wallet: true },
      });
      const usersWithoutWallets = allUsers.filter((user) => !user.wallet);
      expect(usersWithoutWallets).toHaveLength(0);

      // Verify no user exists with the failed email
      const failedUser = await prisma.user.findUnique({
        where: { email: duplicateWalletUserData.email },
      });
      expect(failedUser).toBeNull();

      // Verify only one wallet exists with the original address
      const walletsWithAddress = await prisma.wallet.findMany({
        where: { walletAddress: existingUserData.walletAddress },
      });
      expect(walletsWithAddress).toHaveLength(1);
      expect(walletsWithAddress[0].userId).toBe(
        firstResponse.body.data.user.id
      );
    });

    it("should maintain database consistency after multiple failed registration attempts", async () => {
      // Arrange - Create a successful user first
      const successfulUserData = {
        email: faker.internet.email(),
        password: "StrongPassword123!",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: generateValidWalletAddress(),
      };

      const successResponse = await request(app)
        .post("/register")
        .send(successfulUserData)
        .expect(200);

      createdUserIds.push(successResponse.body.data.user.id);

      // Track successful user's wallet for cleanup
      const successWallet = await prisma.wallet.findUnique({
        where: { userId: successResponse.body.data.user.id },
      });
      if (successWallet) {
        createdWalletIds.push(successWallet.id);
      }

      // Get baseline counts
      const baselineUserCount = await prisma.user.count();
      const baselineWalletCount = await prisma.wallet.count();

      // Arrange - Multiple failing registration attempts
      const failingAttempts = [
        {
          email: successfulUserData.email, // Duplicate email
          password: "DifferentPassword1!",
          firstName: "Fail1",
          lastName: "User1",
          walletAddress: generateValidWalletAddress(),
        },
        {
          email: faker.internet.email(),
          password: "DifferentPassword2!",
          firstName: "Fail2",
          lastName: "User2",
          walletAddress: successfulUserData.walletAddress, // Duplicate wallet
        },
        {
          email: successfulUserData.email, // Duplicate email again
          password: "DifferentPassword3!",
          firstName: "Fail3",
          lastName: "User3",
          walletAddress: generateValidWalletAddress(),
        },
      ];

      // Act - Attempt multiple failing registrations
      const failedResponses = await Promise.all(
        failingAttempts.map((userData) =>
          request(app).post("/register").send(userData).expect(400)
        )
      );

      // Assert - All should fail
      expect(failedResponses).toHaveLength(3);
      failedResponses.forEach((response) => {
        expect(response.status).toBe(400);
      });

      // Verify counts remain unchanged
      const finalUserCount = await prisma.user.count();
      const finalWalletCount = await prisma.wallet.count();

      expect(finalUserCount).toBe(baselineUserCount);
      expect(finalWalletCount).toBe(baselineWalletCount);

      // Verify no orphaned data exists
      const allUsersWithWallets = await prisma.user.findMany({
        include: { wallet: true },
      });
      const orphanedUsers = allUsersWithWallets.filter((user) => !user.wallet);
      expect(orphanedUsers).toHaveLength(0);

      const allWalletsWithUsers = await prisma.wallet.findMany({
        include: { user: true },
      });
      const orphanedWallets = allWalletsWithUsers.filter(
        (wallet) => !wallet.user
      );
      expect(orphanedWallets).toHaveLength(0);

      // Verify referential integrity is maintained
      const allUsers = await prisma.user.findMany({
        include: { wallet: true },
      });

      allUsers.forEach((user) => {
        if (user.wallet) {
          expect(user.wallet.userId).toBe(user.id);
        }
      });
    });
  });
});
