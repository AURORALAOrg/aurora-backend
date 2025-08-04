import { PrismaClient, Status } from "@prisma/client";
import { InternalError } from "../core/api/ApiError";
import WalletService from "./wallet.service";
import logger from "../core/config/logger";

const prisma = new PrismaClient();

class UserService {
  public static async registerUser(userData: {
    email: string;
    hashedPassword: string;
    firstName: string;
    lastName: string;
    walletAddress: string;
  }) {
    const { email, hashedPassword, firstName, lastName, walletAddress } =
      userData;

    logger.info(`Starting user registration for email: ${email}`);

    try {
      const result = await prisma.$transaction(async (tx) => {
        logger.debug(`Creating user record for email: ${email}`);

        // Create user
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            isEmailVerified: false,
          },
        });

        logger.debug(
          `User created successfully with ID: ${newUser.id}, creating wallet for address: ${walletAddress}`
        );

        // Create wallet using the same transaction
        await WalletService.createWalletInTransaction(
          tx,
          newUser.id,
          walletAddress
        );

        logger.info(
          `User registration completed successfully for email: ${email}, user ID: ${newUser.id}`
        );
        return newUser;
      });

      return result;
    } catch (error) {
      // Log detailed error information for debugging
      logger.error(`User registration transaction failed for email: ${email}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userData: {
          email,
          firstName,
          lastName,
          walletAddress,
        },
      });

      // Determine specific error type and provide appropriate user-friendly message
      if (error instanceof Error) {
        // Check for specific database constraint violations
        if (error.message.includes("Unique constraint failed")) {
          if (error.message.includes("email")) {
            logger.warn(`Duplicate email registration attempt: ${email}`);
            throw new InternalError("Email address is already registered");
          }
          if (error.message.includes("walletAddress")) {
            logger.warn(
              `Duplicate wallet address registration attempt: ${walletAddress}`
            );
            throw new InternalError("Wallet address is already registered");
          }
        }

        // Check for database connection issues
        if (
          error.message.includes("connection") ||
          error.message.includes("timeout")
        ) {
          logger.error(
            `Database connection error during registration for email: ${email}`
          );
          throw new InternalError(
            "Service temporarily unavailable. Please try again later"
          );
        }

        // Check for validation errors
        if (
          error.message.includes("validation") ||
          error.message.includes("invalid")
        ) {
          logger.warn(
            `Validation error during registration for email: ${email}: ${error.message}`
          );
          throw new InternalError("Invalid registration data provided");
        }
      }

      // Generic fallback error message
      throw new InternalError("Registration failed. Please try again");
    }
  }

  public static async activateEmail(userId: string) {
    logger.info(`Starting email activation for user ID: ${userId}`);

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true, status: Status.ACTIVE },
      });

      logger.info(
        `Email activation completed successfully for user ID: ${userId}`
      );
      return updatedUser;
    } catch (error) {
      logger.error(`Email activation failed for user ID: ${userId}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        logger.warn(
          `Email activation attempted for non-existent user ID: ${userId}`
        );
        throw new InternalError("User not found");
      }

      throw new InternalError("Failed to verify email");
    }
  }

  public static async readUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  public static async readUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }
}

export default UserService;
