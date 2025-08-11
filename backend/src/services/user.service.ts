import { PrismaClient, Status } from "@prisma/client";
import { InternalError } from "../core/api/ApiError";
import WalletService from "./wallet.service";

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

        await WalletService.createWallet(newUser.id, walletAddress, tx);

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
}

export default UserService;
