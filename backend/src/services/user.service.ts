import { PrismaClient, Prisma } from "@prisma/client";
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
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        data: { isEmailVerified: true, status: "ACTIVE" },
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
}

export default UserService;
