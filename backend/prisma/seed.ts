import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Production guard to prevent accidental seeding
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Seeding is disabled in production. Set ALLOW_PROD_SEED=true to override."
    );
  }

  // Read seed values from environment variables with safe defaults
  const SEED_EMAIL = process.env.LOGIN_EMAIL ?? "customer@aurora.com";
  const SEED_FIRST_NAME = process.env.LOGIN_FIRST_NAME ?? "Aurora";
  const SEED_LAST_NAME = process.env.LOGIN_LAST_NAME ?? "Admin";
  const SEED_PASSWORD = process.env.LOGIN_PASSWORD ?? "password123!";
  const SEED_WALLET_ADDRESS = process.env.LOGIN_WALLET_ADDRESS ?? "0x1234567890123456789012345678901234567890";

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

  // Create or update user (idempotent)
  const user = await prisma.user.upsert({
    where: {
      email: SEED_EMAIL,
    },
    update: {
      password: hashedPassword,
      firstName: SEED_FIRST_NAME,
      lastName: SEED_LAST_NAME,
      isEmailVerified: true,
      status: "ACTIVE",
    },
    create: {
      email: SEED_EMAIL,
      password: hashedPassword,
      firstName: SEED_FIRST_NAME,
      lastName: SEED_LAST_NAME,
      isEmailVerified: true,
      status: "ACTIVE",
    },
  });

  // Create or update wallet for the user (idempotent)
  const wallet = await prisma.wallet.upsert({
    where: {
      userId: user.id,
    },
    update: {
      walletAddress: SEED_WALLET_ADDRESS,
      isVerified: true,
      status: "ACTIVE",
    },
    create: {
      userId: user.id,
      walletAddress: SEED_WALLET_ADDRESS,
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

  console.log("✅ Database seeded successfully!");
}

main()
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
