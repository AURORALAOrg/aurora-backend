import Joi from "joi";

export const awardXPSchema = Joi.object({
  questionId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  isCorrect: Joi.boolean().required(),
  timeSpent: Joi.number().integer().min(0).max(Joi.ref('timeLimit')).required(),
  timeLimit: Joi.number().integer().min(1).required(),
  targetUserId: Joi.string().uuid().optional(),
}).messages({
  'number.max': 'timeSpent cannot exceed timeLimit',
});

export const awardXPValidation = Joi.object({
  body: Joi.object({
    targetUserId: Joi.string().uuid().optional(),
    points: Joi.number().integer().strict().min(1).max(10000).required(),
    reason: Joi.string().valid("question_correct", "admin_grant", "bonus").required(),
    difficultyMultiplier: Joi.number().strict().min(0.5).max(2.0).optional(),
  }).required().unknown(false),
});

export const getUserStatsValidation = Joi.object({
  query: Joi.object({
    userId: Joi.string().uuid().optional(),
  }).required().unknown(false),
});