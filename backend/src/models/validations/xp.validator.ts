import { z } from 'zod';

export const awardXPValidation = z.object({
  body: z.object({
    points: z.number().int().min(1).max(10000),
    reason: z.enum(['question_correct', 'admin_grant', 'bonus']),
    difficultyMultiplier: z.number().finite().min(0.5).max(2.0).optional(),
  }),
});

export const getUserStatsValidation = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
  }),
});