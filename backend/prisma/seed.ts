import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123!", 10);

  const user = await prisma.user.create({
    data: {
      email: "customer@aurora.com",
      password: hashedPassword,
      firstName: "Aurora",
      lastName: "Admin",
      isEmailVerified: true,
      status: "ACTIVE",
    },
  });

  // Create a wallet for the user separately
  const wallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      walletAddress: "0x1234567890123456789012345678901234567890",
      isVerified: true,
      status: "ACTIVE",
    },
  });

  console.log({
    user: {
      id: user.id,
      email: user.email,
    },
    wallet: {
      id: wallet.id,
      walletAddress: wallet.walletAddress,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
