import Joi from "joi";

export const sendMessageValidation = {
  body: Joi.object().keys({
    message: Joi.string().min(1).max(4000).required().messages({
      "string.empty": "Message cannot be empty",
      "string.min": "Message must be at least 1 character long",
      "string.max": "Message cannot exceed 4000 characters",
      "any.required": "Message is required",
    }),
    practiceLevel: Joi.string().valid("A1", "A2", "B1", "B2", "C1", "C2").required().messages({
      "any.only": "Practice level must be one of: A1, A2, B1, B2, C1, C2",
      "any.required": "Practice level is required",
    }),
    conversationContext: Joi.array().items(
      Joi.object().keys({
        role: Joi.string().valid("user", "assistant", "system").required().messages({
          "any.only": "Message role must be one of: user, assistant, system",
          "any.required": "Message role is required",
        }),
        content: Joi.string().min(1).required().messages({
          "string.empty": "Message content cannot be empty",
          "any.required": "Message content is required",
        }),
      })
    ).max(20).optional().messages({
      "array.max": "Conversation context cannot exceed 20 messages",
    }),
    conversationType: Joi.string().max(50).optional().default("general").messages({
      "string.max": "Conversation type cannot exceed 50 characters",
    }),
    conversationId: Joi.string().uuid().optional().messages({
      "string.guid": "Conversation ID must be a valid UUID",
    }),
  }),
};