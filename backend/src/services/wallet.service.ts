import { PrismaClient, Status, Prisma } from "@prisma/client";
import { InternalError } from "../core/api/ApiError";
import logger from "../core/config/logger";

const prisma = new PrismaClient();

class WalletService {
  public static async createWallet(userId: string, walletAddress: string) {
    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.create({
        data: {
          userId,
          walletAddress,
          isVerified: false,
        },
      });

      return wallet;
    });
  }

  public static async createWalletInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    walletAddress: string
  ) {
    try {
      logger.debug(
        `Creating wallet in transaction for user ID: ${userId}, wallet address: ${walletAddress}`
      );

      const wallet = await tx.wallet.create({
        data: {
          userId,
          walletAddress,
          isVerified: false,
        },
      });

      logger.debug(
        `Wallet created successfully in transaction for user ID: ${userId}`
      );
      return wallet;
    } catch (error) {
      logger.error(
        `Wallet creation failed in transaction for user ID: ${userId}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          walletAddress,
        }
      );

      // Re-throw the error to trigger transaction rollback
      throw error;
    }
  }

  public static async readWalletByWalletAddress(walletAddress: string) {
    return await prisma.wallet.findUnique({
      where: { walletAddress },
    });
  }

  public static async storeWalletChallenge(
    walletAddress: string,
    message: string,
    nonce: string
  ) {
    logger.info(`Storing wallet challenge for address: ${walletAddress}`);

    try {
      // Create or update wallet challenge
      await prisma.walletVerificationChallenge.upsert({
        where: { walletAddress },
        update: {
          message,
          nonce,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
        },
        create: {
          walletAddress,
          message,
          nonce,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
        },
      });

      logger.info(
        `Wallet challenge stored successfully for address: ${walletAddress}`
      );
      return true;
    } catch (error) {
      logger.error(
        `Failed to store wallet challenge for address: ${walletAddress}`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          walletAddress,
          nonce,
        }
      );

      throw new InternalError("Failed to create wallet verification challenge");
    }
  }

  public static async getWalletChallenge(walletAddress: string) {
    const challenge = await prisma.walletVerificationChallenge.findUnique({
      where: {
        walletAddress,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return challenge;
  }

  public static async removeWalletChallenge(walletAddress: string) {
    await prisma.walletVerificationChallenge
      .delete({
        where: { walletAddress },
      })
      .catch(() => {
        return;
      });

    return true;
  }

  public static async verifyWallet(walletAddress: string) {
    logger.info(`Starting wallet verification for address: ${walletAddress}`);

    try {
      await prisma.wallet.update({
        where: { walletAddress },
        data: { isVerified: true, status: Status.ACTIVE },
      });

      logger.info(
        `Wallet verification completed successfully for address: ${walletAddress}`
      );
      return true;
    } catch (error) {
      logger.error(`Wallet verification failed for address: ${walletAddress}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        walletAddress,
      });

      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        logger.warn(
          `Wallet verification attempted for non-existent address: ${walletAddress}`
        );
        throw new InternalError("Wallet not found");
      }

      throw new InternalError("Failed to verify wallet");
    }
  }
}

export default WalletService;
