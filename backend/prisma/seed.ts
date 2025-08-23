import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

type GameMetadata = {
  pointsValue: number;
  timeLimit: number;
  difficultyMultiplier: number;
};

// UTC helpers
function utcStartOfDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function daysAgoUTC(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return utcStartOfDay(d);
}
const HOURS = (n: number) => n * 60 * 60 * 1000;

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
      role: "admin",
      totalXP: 0,
      dailyXP: 0,
      weeklyXP: 0,
      currentStreak: 0,
      longestStreak: 0,
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

  await prisma.question.createMany({
    data: [
      {
        content: {
          question: "What is the capital of France?",
          correctAnswer: "Paris",
          wrongAnswers: ["London", "Berlin", "Madrid"],
          explanation: "Paris is the capital city of France.",
        } as Prisma.InputJsonValue,
        metadata: {
          englishLevel: "intermediate",
          difficulty: "easy",
          category: "geography",
          subCategory: "capitals",
          tags: ["geography", "europe"],
          type: "multiple-choice",
        } as Prisma.InputJsonValue,
        gameMetadata: {
          pointsValue: 100,
          timeLimit: 30,
          difficultyMultiplier: 1.5,
        } as Prisma.InputJsonValue,
        createdBy: user.id,
      },
      {
        content: {
          sentence: "The cat ___ on the mat.",
          correctAnswer: "sat",
          hint: "Past tense of sit.",
          explanation: "The correct word is 'sat', the past tense of 'sit'.",
        } as Prisma.InputJsonValue,
        metadata: {
          englishLevel: "beginner",
          difficulty: "easy",
          category: "grammar",
          subCategory: "verbs",
          tags: ["grammar", "verbs"],
          type: "fill-in-blanks",
        } as Prisma.InputJsonValue,
        gameMetadata: {
          pointsValue: 80,
          timeLimit: 20,
          difficultyMultiplier: 1.2,
        } as Prisma.InputJsonValue,
        createdBy: user.id,
      },
    ],
  });

  const createdQuestions = await prisma.question.findMany({
    where: { createdBy: user.id },
    select: { id: true, gameMetadata: true },
    orderBy: { id: "asc" },
  });

  if (createdQuestions.length < 2) {
    throw new Error("Expected at least 2 seeded questions");
  }

  const today = utcStartOfDay();
  const yesterday = daysAgoUTC(1);

  let totalXP = 0;
  let currentStreak = 0;

  // Q1 today
  const q1 = createdQuestions[0];
  const gm1 = q1.gameMetadata as unknown as GameMetadata;
  const baseXP1 = gm1.pointsValue * gm1.difficultyMultiplier; // 100 * 1.5 = 150
  const timeBonus1 = 1.2;                                     // >50% time remaining
  const xpAwarded1 = Math.round(baseXP1 * timeBonus1);        // 180
  totalXP += xpAwarded1;
  currentStreak = 1;

  await prisma.userActivity.create({
    data: {
      userId: user.id,
      activityDate: today,
      xpEarned: xpAwarded1,
      questionsCompleted: 1,
    },
  });

  // Q2 yesterday (streak simulated)
  const q2 = createdQuestions[1];
  const gm2 = q2.gameMetadata as unknown as GameMetadata;
  const baseXP2 = gm2.pointsValue * gm2.difficultyMultiplier; // 80 * 1.2 = 96
  const timeBonus2 = 1.0;
  const streakMultiplier2 = 1.1;                              // streak of 1
  const xpAwarded2 = Math.round(baseXP2 * streakMultiplier2 * timeBonus2); // 106
  totalXP += xpAwarded2;
  currentStreak = 2;

  await prisma.userActivity.create({
    data: {
      userId: user.id,
      activityDate: yesterday,
      xpEarned: xpAwarded2,
      questionsCompleted: 1,
    },
  });

  // Update user XP totals
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totalXP,
      dailyXP: xpAwarded1,
      weeklyXP: totalXP,
      currentStreak,
      longestStreak: currentStreak,
      lastActivityAt: today,
      lastStreakDate: today,
    },
  });

  const now = new Date();
  const staleDate = new Date(now.getTime() - HOURS(27)); // >26h ago
  const staleHashed = await bcrypt.hash("Password123!", 10);
  const staleUser = await prisma.user.create({
    data: {
      email: "stale26h@aurora.com",
      password: staleHashed,
      firstName: "Stale",
      lastName: "User",
      isEmailVerified: true,
      status: "ACTIVE",
      role: "user",
      totalXP: 1000,
      dailyXP: 50,
      weeklyXP: 200,
      currentStreak: 3,       // >0 so job should reset to 0
      longestStreak: 5,
      lastActivityAt: staleDate,
      lastStreakDate: staleDate,
    },
    select: {
      id: true,
      email: true,
      currentStreak: true,
      lastActivityAt: true,
    },
  });

  // (Optional) Log an older activity row so history shows something
  await prisma.userActivity.create({
    data: {
      userId: staleUser.id,
      activityDate: utcStartOfDay(new Date(staleDate)), // the stale day
      xpEarned: 40,
      questionsCompleted: 1,
    },
  });

  console.log({
    user: {
      id: user.id,
      email: user.email,
      totalXP,
      currentStreak,
    },
    wallet: {
      id: wallet.id,
      walletAddress: wallet.walletAddress,
    },
    questions: createdQuestions.map((q) => ({ id: q.id })),
    userActivities: [
      { activityDate: today.toISOString(), xpEarned: xpAwarded1, questionsCompleted: 1 },
      { activityDate: yesterday.toISOString(), xpEarned: xpAwarded2, questionsCompleted: 1 },
    ],
    staleUser,
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
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
