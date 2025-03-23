import Joi from 'joi';

export const createQuestionValidation = {
    body: Joi.object({
        content: Joi.object({
            question: Joi.string().required(),
            correctAnswer: Joi.string().required(),
            wrongAnswers: Joi.array().items(Joi.string()).min(1).required(),
            explanation: Joi.string().required()
        }).required(),
        metadata: Joi.object({
            englishLevel: Joi.string().required(),
            difficulty: Joi.string().required(),
            category: Joi.string().required(),
            subCategory: Joi.string().required(),
            tags: Joi.array().items(Joi.string()).required(),
            type: Joi.string().valid('multiple-choice').required()
        }).required(),
        gameMetadata: Joi.object({
            pointsValue: Joi.number().required(),
            timeLimit: Joi.number().required(),
            difficultyMultiplier: Joi.number().required()
        }).required()
    })
};

export const updateQuestionValidation = {
    body: Joi.object({
        content: Joi.object({
            question: Joi.string(),
            correctAnswer: Joi.string(),
            wrongAnswers: Joi.array().items(Joi.string()).min(1),
            explanation: Joi.string()
        }),
        metadata: Joi.object({
            englishLevel: Joi.string(),
            difficulty: Joi.string(),
            category: Joi.string(),
            subCategory: Joi.string(),
            tags: Joi.array().items(Joi.string()),
            type: Joi.string().valid('multiple-choice')
        }),
        gameMetadata: Joi.object({
            pointsValue: Joi.number(),
            timeLimit: Joi.number(),
            difficultyMultiplier: Joi.number()
        })
    })
}; 