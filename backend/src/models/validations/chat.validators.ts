import Joi from "joi"

export const chatMessageSchema = Joi.object({
  message: Joi.string().required().min(1).max(1000).trim().messages({
    "string.empty": "Message cannot be empty",
    "string.min": "Message must be at least 1 character long",
    "string.max": "Message cannot exceed 1000 characters",
    "any.required": "Message is required",
  }),

  conversationContext: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid("user", "assistant").required(),
        content: Joi.string().required().max(2000),
        timestamp: Joi.date().optional(),
      }),
    )
    .max(20)
    .default([])
    .messages({
      "array.max": "Conversation context cannot exceed 20 messages",
    }),

  practiceLevel: Joi.string().valid("A1", "A2", "B1", "B2", "C1", "C2").required().messages({
    "any.only": "Practice level must be one of: A1, A2, B1, B2, C1, C2",
    "any.required": "Practice level is required",
  }),

  conversationType: Joi.string()
    .valid("general", "business", "travel", "academic", "casual")
    .default("general")
    .messages({
      "any.only": "Conversation type must be one of: general, business, travel, academic, casual",
    }),

  userLanguage: Joi.string().valid("en", "es", "fr", "de", "it", "pt").default("en").messages({
    "any.only": "User language must be one of: en, es, fr, de, it, pt",
  }),
})

export const chatHistorySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  offset: Joi.number().integer().min(0).default(0),
})
