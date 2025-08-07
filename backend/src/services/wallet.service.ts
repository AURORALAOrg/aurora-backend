import { PrismaClient, Status } from "@prisma/client";
import { InternalError } from "../core/api/ApiError";

const prisma = new PrismaClient();

class WalletService {
  public static async createWallet(userId: string, walletAddress: string, tx?: any) {
    const walletOperation = async (transaction: any) => {
      const wallet = await transaction.wallet.create({
        data: {
          userId,
          walletAddress,
          isVerified: false,
        },
      });

      return wallet;
    };

    if (tx) {
      return await walletOperation(tx);
    } else {
      return await prisma.$transaction(async (transaction) => {
        return await walletOperation(transaction);
      });
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

      return true;
    } catch (error) {
      console.error("Error storing wallet challenge:", error);
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
    try {
      await prisma.wallet.update({
        where: { walletAddress },
        data: { isVerified: true, status: Status.ACTIVE },
      });

      return true;
    } catch (error) {
      console.error("Error verifying wallet:", error);
      throw new InternalError("Failed to verify wallet");
    }
  }
}

export default WalletService;
