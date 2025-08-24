import Joi from 'joi';

// Common metadata schema
const commonMetadataSchema = Joi.object({
    englishLevel: Joi.string().required(),
    difficulty: Joi.string().required(),
    category: Joi.string().required(),
    subCategory: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).required(),
    type: Joi.string().valid('multiple-choice', 'sentence-builder', 'fill-in-blanks', 'idiom-challenge', 'word-scramble', 'word-matching', 'story-game').required()
});

// Common game metadata schema
const commonGameMetadataSchema = Joi.object({
    pointsValue: Joi.number().integer().min(1).required(),
    timeLimit: Joi.number().integer().min(5).required(),
    difficultyMultiplier: Joi.number().positive().required()
});

// Multiple choice content schema
const multipleChoiceContentSchema = Joi.object({
    question: Joi.string().required(),
    correctAnswer: Joi.string().required(),
    wrongAnswers: Joi.array().items(Joi.string()).min(3).required(),
    explanation: Joi.string().required()
});

// Sentence builder content schema
const sentenceBuilderContentSchema = Joi.object({
    sentence: Joi.string().required(),
    words: Joi.array().items(Joi.string()).min(2).required(),
    explanation: Joi.string().required()
});

// Fill in the blanks content schema
const fillInTheBlanksContentSchema = Joi.object({
    sentence: Joi.string().required(),
    correctAnswer: Joi.string().required(),
    hint: Joi.string().allow('').optional(),
    explanation: Joi.string().required()
});

// Idiom challenge content schema
const idiomChallengeContentSchema = Joi.object({
    idiom: Joi.string().required(),
    sentence: Joi.string().required(),
    options: Joi.array().items(Joi.string()).min(2).required(),
    correct: Joi.number().required(),
    explanation: Joi.string().required(),
    tips: Joi.array().items(Joi.string()).required()
});

const wordScrambleContentSchema = Joi.object({
  word: Joi.string().required(),
  scrambled: Joi.string().required(),
  hint: Joi.string().required(),
  explanation: Joi.string().required(),
  contextSentence: Joi.string().required(),
});

const wordMatchingContentSchema = Joi.object({
  pairs: Joi.array().items(Joi.object({
    word: Joi.string().required(),
    match: Joi.string().required(),
  })).min(3).required(),
});

const storyGameContentSchema = Joi.object({
  story: Joi.string().required(),
  questions: Joi.array().items(Joi.object({
    question: Joi.string().required(),
    options: Joi.array().items(Joi.string()).min(2).required(),
    correct: Joi.number().required(),
    explanation: Joi.string().required(),
  })).min(1).required(),
  summary: Joi.string().required(),
});

// Combined content schema that validates based on type
export const contentSchema = Joi.alternatives().conditional(Joi.ref('metadata.type'), {
  switch: [
    { is: 'multiple-choice',  then: multipleChoiceContentSchema },
    { is: 'sentence-builder', then: sentenceBuilderContentSchema },
    { is: 'fill-in-blanks',   then: fillInTheBlanksContentSchema },
    { is: 'idiom-challenge',  then: idiomChallengeContentSchema },
    { is: 'word-scramble',    then: wordScrambleContentSchema },
    { is: 'word-matching',    then: wordMatchingContentSchema },
    { is: 'story-game',       then: storyGameContentSchema },
  ],
  otherwise: Joi.forbidden().messages({
    'any.forbidden': 'Unsupported question type in metadata.type'
  }),
});


export const createQuestionValidation = {
    body: Joi.object({
        content: contentSchema.required(),
        metadata: commonMetadataSchema.required(),
        gameMetadata: commonGameMetadataSchema.required()
    }).unknown(false)
};

export const updateQuestionValidation = {
    body: Joi.object({
        content: contentSchema,
        metadata: commonMetadataSchema,
        gameMetadata: commonGameMetadataSchema
    }).unknown(false)
};

// Query parameter validation for getAllQuestions
export const getAllQuestionsValidation = {
    query: Joi.object({
        type: Joi.string().valid('multiple-choice', 'sentence-builder', 'fill-in-blanks', 'idiom-challenge', 'word-scramble', 'word-matching', 'story-game').optional(),
        category: Joi.string().min(1).max(100).optional(),
        subCategory: Joi.string().min(1).max(100).optional(),
        englishLevel: Joi.string().valid('A1', 'A2', 'B1', 'B2', 'C1', 'C2').optional(),
        difficulty: Joi.string().valid('easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced').optional(),
        page: Joi.number().integer().min(1).default(1).optional(),
        limit: Joi.number().integer().min(1).max(100).default(20).optional()
    }).unknown(false)
};

export const idParamValidation = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }).unknown(false),
};

export const submitAnswerValidation = {
    body: Joi.object({
        questionId: Joi.string().uuid().required(),
        answer: Joi.string().trim().min(1).max(2000).required(),
        timeSpent: Joi.number().min(0).required(),
    }).unknown(false),
};