import { z } from 'zod';

export const awardXPValidation = z.object({
  body: z.object({
    points: z.number().int().min(1),
    reason: z.string().min(3),
    difficultyMultiplier: z.number().optional(),
  }),
});

export const getUserStatsValidation = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
  }),
});