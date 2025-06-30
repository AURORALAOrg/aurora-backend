import { AppDataSource } from '../db';
import { Achievement } from '../models/entities/achievement.entity';

async function seed() {
  try {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Achievement);

    const definitions = [
      {
        name: 'First Steps',
        description: 'Complete your first question',
        category: 'progress',
        requirementType: 'questions_correct',
        requirementValue: 1,
        xpBonus: 50,
        badgeUrl: '/badges/first-steps.svg',
      },
      {
        name: 'Getting Started',
        description: 'Answer 10 questions correctly',
        category: 'progress',
        requirementType: 'questions_correct',
        requirementValue: 10,
        xpBonus: 100,
        badgeUrl: '/badges/getting-started.svg',
      },
      {
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        category: 'streak',
        requirementType: 'consecutive_days',
        requirementValue: 7,
        xpBonus: 150,
        badgeUrl: '/badges/week-warrior.svg',
      },
      {
        name: 'Subject Master',
        description: 'Complete 50 questions in one subject',
        category: 'mastery',
        requirementType: 'subject_questions',
        requirementValue: 50,
        xpBonus: 200,
        badgeUrl: '/badges/subject-master.svg',
      },
    ];

    for (const def of definitions) {
      const exists = await repo.findOneBy({ name: def.name });
      if (!exists) {
        await repo.save(repo.create(def));
        console.log(`✅ Created achievement: ${def.name}`);
      } else {
        console.log(`⏭️  Achievement already exists: ${def.name}`);
      }
    }

    console.log('🏅 Achievements seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding achievements:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

seed();
