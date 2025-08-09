import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

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

  // Seed basic topics
  await prisma.topic.createMany({
    data: [
      {
        name: "Food & Restaurants",
        description: "Practice ordering food and restaurant conversations",
        category: "daily_life",
        englishLevel: "A1",
        // @ts-ignore
        prompts: [
          "You are at a restaurant. Order your favorite meal.",
          "Describe your favorite food to a friend.",
        ],
      },
      {
        name: "Travel",
        description: "Practice talking about trips and transportation",
        category: "daily_life",
        englishLevel: "B1",
        // @ts-ignore
        prompts: [
          "Plan a trip to a city you have never visited before.",
          "Ask for directions to a famous landmark.",
        ],
      },
    ],
    skipDuplicates: true,
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
