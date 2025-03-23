import Joi from 'joi';

export const createSentenceOrderingValidation = {
    body: Joi.object({
        content: Joi.object({
            sentence: Joi.string().required(),
            words: Joi.array().items(Joi.string()).min(2).required(),
            explanation: Joi.string().required()
        }).required(),
        metadata: Joi.object({
            englishLevel: Joi.string().required(),
            difficulty: Joi.string().required(),
            category: Joi.string().required(),
            subCategory: Joi.string().required(),
            tags: Joi.array().items(Joi.string()).required(),
            type: Joi.string().valid('drag-and-drop-sentence-builder').required()
        }).required(),
        gameMetadata: Joi.object({
            pointsValue: Joi.number().required(),
            timeLimit: Joi.number().required(),
            difficultyMultiplier: Joi.number().required()
        }).required()
    })
};

export const updateSentenceOrderingValidation = {
    body: Joi.object({
        content: Joi.object({
            sentence: Joi.string(),
            words: Joi.array().items(Joi.string()).min(2),
            explanation: Joi.string()
        }),
        metadata: Joi.object({
            englishLevel: Joi.string(),
            difficulty: Joi.string(),
            category: Joi.string(),
            subCategory: Joi.string(),
            tags: Joi.array().items(Joi.string()),
            type: Joi.string().valid('drag-and-drop-sentence-builder')
        }),
        gameMetadata: Joi.object({
            pointsValue: Joi.number(),
            timeLimit: Joi.number(),
            difficultyMultiplier: Joi.number()
        })
    })
}; 