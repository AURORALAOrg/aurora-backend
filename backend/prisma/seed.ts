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

async function main() {
  // Hash password
  const hashedPassword = await bcrypt.hash("password123!", 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: "customer@aurora.com",
      password: hashedPassword,
      firstName: "Aurora",
      lastName: "Admin",
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

  // Create wallet with valid Stellar public key
  const wallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      walletAddress: "0x1234567890123456789012345678901234567890",
      isVerified: true,
      status: "ACTIVE",
    },
  });
  

  // Create questions
    await prisma.question.createMany({
    data: [
      {
        content: {
          question: 'What is the capital of France?',
          correctAnswer: 'Paris',
          wrongAnswers: ['London', 'Berlin', 'Madrid'],
          explanation: 'Paris is the capital city of France.',
        } as Prisma.InputJsonValue,
        metadata: {
          englishLevel: 'intermediate',
          difficulty: 'easy',
          category: 'geography',
          subCategory: 'capitals',
          tags: ['geography', 'europe'],
          type: 'multiple-choice',
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
          sentence: 'The cat ___ on the mat.',
          correctAnswer: 'sat',
          hint: 'Past tense of sit.',
          explanation: "The correct word is 'sat', the past tense of 'sit'.",
        } as Prisma.InputJsonValue,
        metadata: {
          englishLevel: 'beginner',
          difficulty: 'easy',
          category: 'grammar',
          subCategory: 'verbs',
          tags: ['grammar', 'verbs'],
          type: 'fill-in-blanks',
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

  // Fetch created questions to get IDs, deterministically
  const createdQuestions = await prisma.question.findMany({
    where: { createdBy: user.id },
    select: { id: true, gameMetadata: true },
    orderBy: { id: 'asc' }, // deterministic; change to { createdAt: 'asc' } if your model has createdAt
  });

  if (createdQuestions.length < 2) {
    throw new Error('Expected at least 2 seeded questions');
  }

  // UTC dates for activities
  const today = utcStartOfDay();
  const yesterday = daysAgoUTC(1);

  let totalXP = 0;
  let currentStreak = 0;

  // Award XP for first question (today)
  const question1 = createdQuestions[0];
  const gameMetadata1 = question1.gameMetadata as unknown as GameMetadata;
  const baseXP1 = gameMetadata1.pointsValue * gameMetadata1.difficultyMultiplier; // 100 * 1.5 = 150
  const timeBonus1 = 1.2; // Assume timeSpent < timeLimit * 0.5
  const xpAwarded1 = Math.round(baseXP1 * timeBonus1); // 150 * 1.2 = 180
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

  // Award XP for second question (yesterday, to simulate streak)
  const question2 = createdQuestions[1];
  const gameMetadata2 = question2.gameMetadata as unknown as GameMetadata;
  const baseXP2 = gameMetadata2.pointsValue * gameMetadata2.difficultyMultiplier; // 80 * 1.2 = 96
  const timeBonus2 = 1.0; // No time bonus
  const streakMultiplier2 = 1.1; // Streak of 1
  const xpAwarded2 = Math.round(baseXP2 * streakMultiplier2 * timeBonus2); // 96 * 1.1 = 106
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

  // Update user's XP and streak
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