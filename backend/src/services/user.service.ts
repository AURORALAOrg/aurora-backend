import { PrismaClient, Status } from "@prisma/client";
import { InternalError } from "../core/api/ApiError";

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

    try {
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            isEmailVerified: false,
          },
        });
        return newUser;
      });

      return result;
    } catch (error) {
      console.error("Registration error:", error);
      throw new InternalError("Failed to register user");
    }
  }

  public static async activateEmail(userId: string) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true, status: Status.ACTIVE },
      });
    } catch (error) {
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

  public static async updateLastLogin(userId: string) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          lastActivityAt: new Date()
        },
      });
    } catch (error) {
      console.error("Failed to update last login:", error);
      throw new InternalError("Failed to update last login");
    }
  }

  public static async updateLastActivity(userId: string) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { lastActivityAt: new Date() },
      });
    } catch (error) {
      console.error("Failed to update last activity:", error);
      // Don't throw error for activity tracking to avoid breaking requests
    }
  }

  public static async findInactiveUsers(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      return await prisma.user.findMany({
        where: {
          status: Status.ACTIVE,
          isEmailVerified: true,
          OR: [
            {
              lastActivityAt: {
                lte: cutoffDate,
              },
            },
            {
              lastActivityAt: null,
              createdAt: {
                lte: cutoffDate,
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          lastActivityAt: true,
          lastReminderSent: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.error("Failed to find inactive users:", error);
      throw new InternalError("Failed to find inactive users");
    }
  }

  public static async countInactiveUsers(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      return await prisma.user.count({
        where: {
          status: Status.ACTIVE,
          isEmailVerified: true,
          OR: [
            {
              lastActivityAt: {
                lte: cutoffDate,
              },
            },
            {
              lastActivityAt: null,
              createdAt: {
                lte: cutoffDate,
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error("Failed to count inactive users:", error);
      throw new InternalError("Failed to count inactive users");
    }
  }

  public static async updateReminderSent(userId: string) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { lastReminderSent: new Date() },
      });
    } catch (error) {
      console.error("Failed to update reminder sent:", error);
      throw new InternalError("Failed to update reminder sent");
    }
  }

  public static async updateReminderSentBatch(userIds: string[]): Promise<void> {
    try {
      await prisma.$transaction(
        userIds.map(userId =>
          prisma.user.update({
            where: { id: userId },
            data: { lastReminderSent: new Date() }
          })
        )
      );
    } catch (error) {
      console.error("Failed to batch update reminder sent:", error);
      throw new InternalError("Failed to batch update reminder sent");
    }
  }
}

export default UserService;
