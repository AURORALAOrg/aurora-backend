import { Router } from 'express';
import QuestionController from '../../../controllers/question.controller';
import { isAuthorized, requireRole } from '../../../middlewares/authentication';
import validateRequest from '../../../middlewares/validator';
import {
    createQuestionValidation,
    updateQuestionValidation,
    getAllQuestionsValidation,
    idParamValidation,
    submitAnswerValidation
} from '../../../models/validations/question.validators';


const router = Router();

// Protected routes (require authentication)
// router.use(isAuthorized());

// Question routes
router.post('/', isAuthorized(), validateRequest(createQuestionValidation), QuestionController.createQuestion);
router.get('/', validateRequest(getAllQuestionsValidation), QuestionController.getAllQuestions);
router.get('/:id', validateRequest(idParamValidation), QuestionController.getQuestionById);
router.put('/:id', isAuthorized(), validateRequest(idParamValidation), validateRequest(updateQuestionValidation), QuestionController.updateQuestion);
router.delete('/:id', isAuthorized(),
    requireRole('admin'),
    validateRequest(idParamValidation),
    QuestionController.deleteQuestion
);
router.post(
    '/submit-answer',
    isAuthorized(),
    validateRequest(submitAnswerValidation),
    QuestionController.submitAnswer
);

export default router; 