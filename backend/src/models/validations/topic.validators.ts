import Joi from "joi";
import { Category } from "@prisma/client";

const englishLevelEnum = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const categoryEnum = Object.values(Category) as readonly Category[];

export const createTopicValidation = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow("").max(500).optional(),
    category: Joi.string().valid(...categoryEnum).required(),
    englishLevel: Joi.string()
      .valid(...englishLevelEnum)
      .required(),
    prompts: Joi.array().items(Joi.string().min(5).max(500)).min(1).required(),
  }),
};

export const updateTopicValidation = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().allow("").max(500).optional(),
    category: Joi.string().valid(...categoryEnum).optional(),
    englishLevel: Joi.string().valid(...englishLevelEnum).optional(),
    prompts: Joi.array().items(Joi.string().min(5).max(500)).min(1).optional(),
  }),
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

export const getTopicsQueryValidation = {
  query: Joi.object({
    level: Joi.string().valid(...englishLevelEnum).optional(),
    category: Joi.string().valid(...categoryEnum).optional(),
  }),
};

export const getTopicsByLevelValidation = {
  params: Joi.object({ level: Joi.string().valid(...englishLevelEnum).required() }),
  query: Joi.object({ category: Joi.string().valid(...categoryEnum).optional() }),
};

export const getTopicByIdValidation = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

export const deleteTopicValidation = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};


