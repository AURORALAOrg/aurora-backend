import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import UserService from "../../src/services/user.service";
import { InternalError } from "../../src/core/api/ApiError";
import { generateUniqueWalletAddress } from "../helpers/testUtils";

// Create a Prisma client for testing
const prisma = new PrismaClient();

describe("UserService - Atomic Registration Integration Tests", () => {
  let createdUserIds: string[] = [];
  let createdWalletIds: string[] = [];

  beforeAll(async () => {
    // Ensure database connection is working
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Reset tracking arrays
    createdUserIds = [];
    createdWalletIds = [];

    // Ensure clean state by removing any leftover test data
    try {
      await prisma.walletVerificationChallenge.deleteMany();
      await prisma.wallet.deleteMany({
        where: {
          walletAddress: {
            in: [
              "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOYVTZMHSTGJ5THPGWWTNP5TPBUJ",
              "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
            ],
          },
        },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up any verification challenges first
    try {
      await prisma.walletVerificationChallenge.deleteMany();
    } catch (error) {
      // Table might not exist in test environment, ignore
    }

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

    // Additional cleanup: remove any orphaned records that might have been created
    // during failed transactions (this addresses the specific test failure)
    try {
      await prisma.wallet.deleteMany({
        where: {
          walletAddress:
            "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
        },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Successful Atomic Registration", () => {
    it("should successfully create user and wallet in single transaction", async () => {
      // Arrange
      const userData = {
        email: faker.internet.email(),
        hashedPassword: "hashedPassword123",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOYVTZMHSTGJ5THPGWWTNP5TPBUJ",
      };

      // Act
      const result = await UserService.registerUser(userData);

      // Track created entities for cleanup
      createdUserIds.push(result.id);

      // Assert user creation
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.firstName).toBe(userData.firstName);
      expect(result.lastName).toBe(userData.lastName);
      expect(result.isEmailVerified).toBe(false);

      // Verify user exists in database
      const createdUser = await prisma.user.findUnique({
        where: { id: result.id },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(userData.email);

      // Verify wallet was created atomically
      const createdWallet = await prisma.wallet.findUnique({
        where: { userId: result.id },
      });
      expect(createdWallet).toBeDefined();
      expect(createdWallet?.walletAddress).toBe(userData.walletAddress);
      expect(createdWallet?.isVerified).toBe(false);

      // Track wallet for cleanup
      if (createdWallet) {
        createdWalletIds.push(createdWallet.id);
      }
    });
  });

  describe("Transaction Rollback on User Creation Failure", () => {
    it("should rollback transaction when user creation fails due to duplicate email", async () => {
      // Arrange - Create first user
      const userData = {
        email: faker.internet.email(),
        hashedPassword: "hashedPassword123",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOYVTZMHSTGJ5THPGWWTNP5TPBUJ",
      };

      // Create first user successfully
      const firstUser = await UserService.registerUser(userData);
      createdUserIds.push(firstUser.id);

      // Track first user's wallet for cleanup
      const firstWallet = await prisma.wallet.findUnique({
        where: { userId: firstUser.id },
      });
      if (firstWallet) {
        createdWalletIds.push(firstWallet.id);
      }

      // Arrange - Try to create second user with same email
      const duplicateUserData = {
        email: userData.email, // Same email
        hashedPassword: "hashedPassword456",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37", // Different wallet
      };

      // Act & Assert
      await expect(UserService.registerUser(duplicateUserData)).rejects.toThrow(
        InternalError
      );
      await expect(UserService.registerUser(duplicateUserData)).rejects.toThrow(
        "Email address is already registered"
      );

      // Verify no additional user was created
      const users = await prisma.user.findMany({
        where: { email: userData.email },
      });
      expect(users).toHaveLength(1);

      // Verify no additional wallet was created
      const wallets = await prisma.wallet.findMany({
        where: { walletAddress: duplicateUserData.walletAddress },
      });
      expect(wallets).toHaveLength(0);
    });
  });

  describe("Transaction Rollback on Wallet Creation Failure", () => {
    it("should rollback user creation when wallet creation fails due to duplicate wallet address", async () => {
      // Arrange - Create first user with wallet
      const firstUserData = {
        email: faker.internet.email(),
        hashedPassword: "hashedPassword123",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOYVTZMHSTGJ5THPGWWTNP5TPBUJ",
      };

      // Create first user successfully
      const firstUser = await UserService.registerUser(firstUserData);
      createdUserIds.push(firstUser.id);

      // Track first user's wallet for cleanup
      const firstWallet = await prisma.wallet.findUnique({
        where: { userId: firstUser.id },
      });
      if (firstWallet) {
        createdWalletIds.push(firstWallet.id);
      }

      // Arrange - Try to create second user with same wallet address
      const duplicateWalletUserData = {
        email: faker.internet.email(), // Different email
        hashedPassword: "hashedPassword456",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: firstUserData.walletAddress, // Same wallet address
      };

      // Act & Assert
      await expect(
        UserService.registerUser(duplicateWalletUserData)
      ).rejects.toThrow(InternalError);
      await expect(
        UserService.registerUser(duplicateWalletUserData)
      ).rejects.toThrow("Wallet address is already registered");

      // Verify no additional user was created (transaction rolled back)
      const userWithDuplicateEmail = await prisma.user.findUnique({
        where: { email: duplicateWalletUserData.email },
      });
      expect(userWithDuplicateEmail).toBeNull();

      // Verify only one wallet exists with that address
      const walletsWithAddress = await prisma.wallet.findMany({
        where: { walletAddress: firstUserData.walletAddress },
      });
      expect(walletsWithAddress).toHaveLength(1);
      expect(walletsWithAddress[0].userId).toBe(firstUser.id);
    });
  });

  describe("Error Handling", () => {
    it("should handle database constraint violations appropriately", async () => {
      // This test verifies that the service handles database-level constraint violations
      // Note: Input validation typically happens at the controller/middleware level

      // Arrange - Create a user first
      const firstUserData = {
        email: faker.internet.email(),
        hashedPassword: "hashedPassword123",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOYVTZMHSTGJ5THPGWWTNP5TPBUJ",
      };

      const firstUser = await UserService.registerUser(firstUserData);
      createdUserIds.push(firstUser.id);

      const firstWallet = await prisma.wallet.findUnique({
        where: { userId: firstUser.id },
      });
      if (firstWallet) {
        createdWalletIds.push(firstWallet.id);
      }

      // Now try to create another user with same email (database constraint violation)
      const duplicateUserData = {
        email: firstUserData.email, // Same email - will cause constraint violation
        hashedPassword: "hashedPassword456",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
      };

      // Act & Assert
      await expect(UserService.registerUser(duplicateUserData)).rejects.toThrow(
        InternalError
      );
      await expect(UserService.registerUser(duplicateUserData)).rejects.toThrow(
        "Email address is already registered"
      );

      // Verify no additional user was created
      const users = await prisma.user.findMany({
        where: { email: firstUserData.email },
      });
      expect(users).toHaveLength(1);
    });
  });

  describe("Database Consistency", () => {
    it("should maintain referential integrity between user and wallet", async () => {
      // Arrange
      const userData = {
        email: faker.internet.email(),
        hashedPassword: "hashedPassword123",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOYVTZMHSTGJ5THPGWWTNP5TPBUJ",
      };

      // Act
      const result = await UserService.registerUser(userData);
      createdUserIds.push(result.id);

      // Assert referential integrity
      const userWithWallet = await prisma.user.findUnique({
        where: { id: result.id },
        include: { wallet: true },
      });

      expect(userWithWallet).toBeDefined();
      expect(userWithWallet?.wallet).toBeDefined();
      expect(userWithWallet?.wallet?.userId).toBe(result.id);
      expect(userWithWallet?.wallet?.walletAddress).toBe(
        userData.walletAddress
      );

      // Track wallet for cleanup
      if (userWithWallet?.wallet) {
        createdWalletIds.push(userWithWallet.wallet.id);
      }

      // Verify wallet points back to user
      const walletWithUser = await prisma.wallet.findUnique({
        where: { userId: result.id },
        include: { user: true },
      });

      expect(walletWithUser).toBeDefined();
      expect(walletWithUser?.user).toBeDefined();
      expect(walletWithUser?.user.id).toBe(result.id);
      expect(walletWithUser?.user.email).toBe(userData.email);
    });

    it("should ensure atomic behavior - both entities created or neither", async () => {
      // This test verifies that if we have a partial failure scenario,
      // neither the user nor wallet should exist in the database

      const userData = {
        email: faker.internet.email(),
        hashedPassword: "hashedPassword123",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress:
          "GCKFBEIYTKP6RCZNVPH73XL7XFWTEOYVTZMHSTGJ5THPGWWTNP5TPBUJ",
      };

      // First, create a user successfully to establish baseline
      const successfulUser = await UserService.registerUser(userData);
      createdUserIds.push(successfulUser.id);

      const successfulWallet = await prisma.wallet.findUnique({
        where: { userId: successfulUser.id },
      });
      if (successfulWallet) {
        createdWalletIds.push(successfulWallet.id);
      }

      // Now try to create another user with same wallet address (should fail)
      const failingUserData = {
        email: faker.internet.email(), // Different email
        hashedPassword: "hashedPassword456",
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        walletAddress: userData.walletAddress, // Same wallet address - should cause failure
      };

      // Attempt registration (should fail)
      try {
        await UserService.registerUser(failingUserData);
        fail("Expected registration to fail due to duplicate wallet address");
      } catch (error) {
        // Expected to fail
      }

      // Verify atomic behavior - no partial creation
      const failedUser = await prisma.user.findUnique({
        where: { email: failingUserData.email },
      });
      expect(failedUser).toBeNull(); // User should not exist

      // Verify only the original wallet exists
      const walletsWithAddress = await prisma.wallet.findMany({
        where: { walletAddress: userData.walletAddress },
      });
      expect(walletsWithAddress).toHaveLength(1);
      expect(walletsWithAddress[0].userId).toBe(successfulUser.id);
    });
  });
});
