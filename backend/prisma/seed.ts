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

  // Seed basic topics (idempotent)
  const topics = [
    {
      name: "Food & Restaurants",
      description: "Practice ordering food and restaurant conversations",
      category: "FOOD" as const,
      englishLevel: "A1" as const,
      prompts: [
        "You are at a restaurant. Order your favorite meal.",
        "Describe your favorite food to a friend.",
      ],
    },
    {
      name: "Travel",
      description: "Practice talking about trips and transportation",
      category: "TRAVEL" as const,
      englishLevel: "B1" as const,
      prompts: [
        "Plan a trip to a city you have never visited before.",
        "Ask for directions to a famous landmark.",
      ],
    },
  ];

    for (const t of topics) {
    await prisma.topic.upsert({
      where: {
        name_category_englishLevel: {
          name: t.name,
          category: t.category,
          englishLevel: t.englishLevel,
        },
      },
      update: {
        description: t.description,
        prompts: t.prompts,
      },
      create: {
        name: t.name,
        description: t.description,
        category: t.category,
        englishLevel: t.englishLevel,
        prompts: t.prompts,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
