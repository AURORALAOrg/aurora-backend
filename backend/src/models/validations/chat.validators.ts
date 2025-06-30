import Joi from "joi"

// Available practice levels and conversation types
const practiceLevels = ["A1", "A2", "B1", "B2", "C1", "C2"]
const conversationTypes = ["general", "business", "travel", "academic", "casual"]
const userLanguages = ["en", "es", "fr", "de", "it", "pt"]

// Chat message schema
const chatMessageSchema = Joi.object({
  role: Joi.string().valid("user", "assistant").required().messages({
    "any.only": "Message role must be either 'user' or 'assistant'",
    "any.required": "Message role is required",
  }),
  content: Joi.string().min(1).max(2000).required().messages({
    "string.min": "Message content cannot be empty",
    "string.max": "Message content cannot exceed 2000 characters",
    "any.required": "Message content is required",
  }),
  timestamp: Joi.date().optional(),
})

// Chat message validator
export const chatMessageValidator = Joi.object({
  message: Joi.string().min(1).max(1000).required().messages({
    "string.min": "Message cannot be empty",
    "string.max": "Message cannot exceed 1000 characters",
    "any.required": "Message is required",
  }),
  conversationContext: Joi.array().items(chatMessageSchema).max(20).default([]).messages({
    "array.max": "Conversation context cannot exceed 20 messages",
  }),
  practiceLevel: Joi.string()
    .valid(...practiceLevels)
    .required()
    .messages({
      "any.only": `Practice level must be one of: ${practiceLevels.join(", ")}`,
      "any.required": "Practice level is required",
    }),
  conversationType: Joi.string()
    .valid(...conversationTypes)
    .default("general")
    .messages({
      "any.only": `Conversation type must be one of: ${conversationTypes.join(", ")}`,
    }),
  userLanguage: Joi.string()
    .valid(...userLanguages)
    .default("en")
    .messages({
      "any.only": `User language must be one of: ${userLanguages.join(", ")}`,
    }),
  topicId: Joi.string().uuid().optional().messages({
    "string.guid": "Topic ID must be a valid UUID",
  }),
})

// Conversation starters validator
export const conversationStartersValidator = Joi.object({
  practiceLevel: Joi.string()
    .valid(...practiceLevels)
    .required()
    .messages({
      "any.only": `Practice level must be one of: ${practiceLevels.join(", ")}`,
      "any.required": "Practice level is required",
    }),
  conversationType: Joi.string()
    .valid(...conversationTypes)
    .default("general")
    .messages({
      "any.only": `Conversation type must be one of: ${conversationTypes.join(", ")}`,
    }),
})
