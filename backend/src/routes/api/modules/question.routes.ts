import { Router } from 'express';
import QuestionController from '../../../controllers/question.controller';
import { isAuthorized } from '../../../middlewares/authentication';
import validateRequest from '../../../middlewares/validator';
import {
    createQuestionValidation,
    updateQuestionValidation,
    getAllQuestionsValidation,
} from '../../../models/validations/question.validators';
import Joi from 'joi';
export const submitAnswerValidation = {
    body: Joi.object({
        questionId: Joi.string().uuid().required(),
        answer: Joi.string().min(1).required(),
        timeSpent: Joi.number().min(0).required(),
    }),
};

const router = Router();

// Protected routes (require authentication)
// router.use(isAuthorized());

// Question routes
router.post('/', isAuthorized(), validateRequest(createQuestionValidation), QuestionController.createQuestion);
router.get('/', validateRequest(getAllQuestionsValidation), QuestionController.getAllQuestions);
router.get('/:id', QuestionController.getQuestionById);
router.put('/:id', isAuthorized(), validateRequest(updateQuestionValidation), QuestionController.updateQuestion);
router.delete('/:id', isAuthorized(),
  validateRequest({ params: Joi.object({ id: Joi.string().uuid().required() }) }),
  QuestionController.deleteQuestion
);
router.post(
    '/submit-answer',
    isAuthorized(),
    validateRequest(submitAnswerValidation),
    QuestionController.submitAnswer
);

export default router; 