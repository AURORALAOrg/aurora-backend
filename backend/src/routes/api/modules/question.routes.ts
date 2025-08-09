import { Router } from 'express';
import QuestionController from '../../../controllers/question.controller';
import { isAuthorized } from '../../../middlewares/authentication';
import validateRequest from '../../../middlewares/validator';
import {
    createQuestionValidation,
    updateQuestionValidation,
} from '../../../models/validations/question.validators';
import { z } from 'zod';
const submitAnswerValidation = z.object({
    body: z.object({
        questionId: z.string().uuid(),
        answer: z.string().min(1),
        timeSpent: z.number().min(0),
    }),
});

const router = Router();

// Protected routes (require authentication)
// router.use(isAuthorized());

// Question routes
router.post('/', isAuthorized(), validateRequest(createQuestionValidation), QuestionController.createQuestion);
router.get('/', QuestionController.getAllQuestions);
router.get('/:id', QuestionController.getQuestionById);
router.put('/:id', isAuthorized(), validateRequest(updateQuestionValidation), QuestionController.updateQuestion);
router.delete('/:id', QuestionController.deleteQuestion);
router.post(
    '/submit-answer',
    isAuthorized(),
    validateRequest(submitAnswerValidation),
    QuestionController.submitAnswer
);

export default router; 