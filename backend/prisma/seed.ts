import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

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
  const questions = await prisma.question.createMany({
    data: [
      {
        content: {
          question: "What is the capital of France?",
          correctAnswer: "Paris",
          wrongAnswers: ["London", "Berlin", "Madrid"],
          explanation: "Paris is the capital city of France.",
        },
        metadata: {
          englishLevel: "intermediate",
          difficulty: "easy",
          category: "geography",
          subCategory: "capitals",
          tags: ["geography", "europe"],
          type: "multiple-choice",
        },
        gameMetadata: {
          pointsValue: 100,
          timeLimit: 30,
          difficultyMultiplier: 1.5,
        },
        createdBy: user.id,
      },
      {
        content: {
          sentence: "The cat ___ on the mat.",
          correctAnswer: "sat",
          hint: "Past tense of sit.",
          explanation: "The correct word is 'sat', the past tense of 'sit'.",
        },
        metadata: {
          englishLevel: "beginner",
          difficulty: "easy",
          category: "grammar",
          subCategory: "verbs",
          tags: ["grammar", "verbs"],
          type: "fill-in-blanks",
        },
        gameMetadata: {
          pointsValue: 80,
          timeLimit: 20,
          difficultyMultiplier: 1.2,
        },
        createdBy: user.id,
      },
    ],
  });

  // Fetch created questions to get their IDs
  const createdQuestions = await prisma.question.findMany({
    where: { createdBy: user.id },
    select: { id: true, gameMetadata: true },
  });

  // Simulate XP awards
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let totalXP = 0;
  let currentStreak = 0;

  // Award XP for first question (today)
  const question1 = createdQuestions[0];
  const gameMetadata1 = question1.gameMetadata as any;
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
  const gameMetadata2 = question2.gameMetadata as any;
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
      dailyXP: xpAwarded1, // Today's XP
      weeklyXP: totalXP, // Assume within the same week
      currentStreak,
      longestStreak: currentStreak,
      lastActivityAt: today,
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