import Joi from "joi";

export const awardXPSchema = Joi.object({
  questionId: Joi.string().min(1).required(),
  isCorrect: Joi.boolean().required(),
  timeSpent: Joi.number().integer().min(0).required(),
  timeLimit: Joi.number().integer().greater(0).required(),
  targetUserId: Joi.string().uuid().optional(),
});

export const awardXPValidation = Joi.object({
  body: Joi.object({
    points: Joi.number().integer().min(1).max(10000).required(),
    reason: Joi.string().valid("question_correct", "admin_grant", "bonus").required(),
    difficultyMultiplier: Joi.number().min(0.5).max(2.0).optional(),
  }).required(),
});

export const getUserStatsValidation = Joi.object({
  query: Joi.object({
    userId: Joi.string().uuid().optional(),
  }).required(),
});