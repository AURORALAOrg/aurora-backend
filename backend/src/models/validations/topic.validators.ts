import Joi from "joi"

// Available English levels and categories
const englishLevels = ["A1", "A2", "B1", "B2", "C1", "C2"]
const topicCategories = [
  "daily_life",
  "work_business",
  "travel",
  "education",
  "entertainment",
  "health",
  "technology",
  "culture",
  "grammar",
  "vocabulary",
]

// Topic prompt schema
const topicPromptSchema = Joi.object({
  text: Joi.string().min(10).max(500).required().messages({
    "string.min": "Prompt text must be at least 10 characters long",
    "string.max": "Prompt text cannot exceed 500 characters",
    "any.required": "Prompt text is required",
  }),
  type: Joi.string().valid("starter", "follow_up", "scenario").required().messages({
    "any.only": "Prompt type must be one of: starter, follow_up, scenario",
    "any.required": "Prompt type is required",
  }),
  difficulty: Joi.string().min(1).max(50).required().messages({
    "any.required": "Prompt difficulty is required",
  }),
})

// Topic keyword schema
const topicKeywordSchema = Joi.object({
  word: Joi.string().min(1).max(100).required().messages({
    "string.min": "Keyword must be at least 1 character long",
    "string.max": "Keyword cannot exceed 100 characters",
    "any.required": "Keyword is required",
  }),
  definition: Joi.string().min(5).max(300).required().messages({
    "string.min": "Definition must be at least 5 characters long",
    "string.max": "Definition cannot exceed 300 characters",
    "any.required": "Keyword definition is required",
  }),
  example: Joi.string().min(5).max(200).required().messages({
    "string.min": "Example must be at least 5 characters long",
    "string.max": "Example cannot exceed 200 characters",
    "any.required": "Keyword example is required",
  }),
  difficulty: Joi.string().valid("basic", "intermediate", "advanced").required().messages({
    "any.only": "Keyword difficulty must be one of: basic, intermediate, advanced",
    "any.required": "Keyword difficulty is required",
  }),
})

// Topic objective schema
const topicObjectiveSchema = Joi.object({
  skill: Joi.string().valid("speaking", "listening", "vocabulary", "grammar").required().messages({
    "any.only": "Skill must be one of: speaking, listening, vocabulary, grammar",
    "any.required": "Skill is required",
  }),
  description: Joi.string().min(10).max(300).required().messages({
    "string.min": "Objective description must be at least 10 characters long",
    "string.max": "Objective description cannot exceed 300 characters",
    "any.required": "Objective description is required",
  }),
  examples: Joi.array().items(Joi.string().min(5).max(200)).min(1).max(5).required().messages({
    "array.min": "At least one example is required",
    "array.max": "Maximum 5 examples allowed",
    "any.required": "Examples are required",
  }),
})

// Create topic validator
export const createTopicValidator = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    "string.min": "Topic name must be at least 3 characters long",
    "string.max": "Topic name cannot exceed 100 characters",
    "any.required": "Topic name is required",
  }),
  description: Joi.string().min(10).max(500).required().messages({
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description cannot exceed 500 characters",
    "any.required": "Description is required",
  }),
  category: Joi.string()
    .valid(...topicCategories)
    .required()
    .messages({
      "any.only": `Category must be one of: ${topicCategories.join(", ")}`,
      "any.required": "Category is required",
    }),
  englishLevel: Joi.string()
    .valid(...englishLevels)
    .required()
    .messages({
      "any.only": `English level must be one of: ${englishLevels.join(", ")}`,
      "any.required": "English level is required",
    }),
  prompts: Joi.array().items(topicPromptSchema).min(1).max(20).required().messages({
    "array.min": "At least one prompt is required",
    "array.max": "Maximum 20 prompts allowed",
    "any.required": "Prompts are required",
  }),
  keywords: Joi.array().items(topicKeywordSchema).min(0).max(50).default([]).messages({
    "array.max": "Maximum 50 keywords allowed",
  }),
  objectives: Joi.array().items(topicObjectiveSchema).min(0).max(10).default([]).messages({
    "array.max": "Maximum 10 objectives allowed",
  }),
})

// Update topic validator
export const updateTopicValidator = Joi.object({
  name: Joi.string().min(3).max(100).messages({
    "string.min": "Topic name must be at least 3 characters long",
    "string.max": "Topic name cannot exceed 100 characters",
  }),
  description: Joi.string().min(10).max(500).messages({
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description cannot exceed 500 characters",
  }),
  category: Joi.string()
    .valid(...topicCategories)
    .messages({
      "any.only": `Category must be one of: ${topicCategories.join(", ")}`,
    }),
  englishLevel: Joi.string()
    .valid(...englishLevels)
    .messages({
      "any.only": `English level must be one of: ${englishLevels.join(", ")}`,
    }),
  prompts: Joi.array().items(topicPromptSchema).min(1).max(20).messages({
    "array.min": "At least one prompt is required",
    "array.max": "Maximum 20 prompts allowed",
  }),
  keywords: Joi.array().items(topicKeywordSchema).min(0).max(50).messages({
    "array.max": "Maximum 50 keywords allowed",
  }),
  objectives: Joi.array().items(topicObjectiveSchema).min(0).max(10).messages({
    "array.max": "Maximum 10 objectives allowed",
  }),
}).min(1)

// Get topics validator
export const getTopicsValidator = Joi.object({
  level: Joi.string()
    .valid(...englishLevels)
    .messages({
      "any.only": `Level must be one of: ${englishLevels.join(", ")}`,
    }),
  category: Joi.string()
    .valid(...topicCategories)
    .messages({
      "any.only": `Category must be one of: ${topicCategories.join(", ")}`,
    }),
  status: Joi.string().valid("active", "inactive").messages({
    "any.only": "Status must be either 'active' or 'inactive'",
  }),
  search: Joi.string().min(1).max(100).messages({
    "string.min": "Search term must be at least 1 character long",
    "string.max": "Search term cannot exceed 100 characters",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.min": "Page must be at least 1",
    "number.integer": "Page must be an integer",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
    "number.integer": "Limit must be an integer",
  }),
})

// Get random prompts validator
export const getRandomPromptsValidator = Joi.object({
  level: Joi.string()
    .valid(...englishLevels)
    .required()
    .messages({
      "any.only": `Level must be one of: ${englishLevels.join(", ")}`,
      "any.required": "Level is required",
    }),
  category: Joi.string()
    .valid(...topicCategories)
    .messages({
      "any.only": `Category must be one of: ${topicCategories.join(", ")}`,
    }),
  count: Joi.number().integer().min(1).max(10).default(3).messages({
    "number.min": "Count must be at least 1",
    "number.max": "Count cannot exceed 10",
    "number.integer": "Count must be an integer",
  }),
})
