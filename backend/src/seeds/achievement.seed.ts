import { AppDataSource } from '../db';
import { Achievement } from '../models/entities/achievement.entity';

async function seed() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Achievement);

  const definitions = [
    { name: 'First Steps', description: 'Complete your first question', category: 'progress', requirementType: 'questions_correct', requirementValue: 1, xpBonus: 50, badgeUrl: '/badges/first-steps.svg' },
    
  ];

  for (const def of definitions) {
    const exists = await repo.findOneBy({ name: def.name });
    if (!exists) await repo.save(repo.create(def));
  }

  console.log('🏅 Achievements seeded');
  process.exit();
}

seed();