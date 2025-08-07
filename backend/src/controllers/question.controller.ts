import { Request, Response } from 'express';
import { createQuestionValidation, updateQuestionValidation } from '../models/validations/question.validators';
import QuestionService from '../services/question.service';
import { BadRequestError, InternalError } from '../core/api/ApiError';
import asyncHandler from '../middlewares/async';
import { SuccessResponse, BadRequestResponse, CreatedResponse } from '../core/api/ApiResponse';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
    };
}

class QuestionController {
    public static createQuestion = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { error } = createQuestionValidation.body.validate(req.body);
        if (error) {
            throw new BadRequestError(error.details[0].message);
        }

        if (!req.user?.id) {
            throw new BadRequestError('User not authenticated');
        }

        const question = await QuestionService.createQuestion({
            ...req.body,
            createdBy: req.user.id
        });

        return new CreatedResponse('Question created successfully', question).send(res);
    });

    public static updateQuestion = asyncHandler(async (req: Request, res: Response) => {
        const { error } = updateQuestionValidation.body.validate(req.body);
        if (error) {
            throw new BadRequestError(error.details[0].message);
        }

        const question = await QuestionService.updateQuestion({
            id: req.params.id,
            ...req.body
        });

        return new SuccessResponse('Question updated successfully', question).send(res);
    });

    public static getQuestionById = asyncHandler(async (req: Request, res: Response) => {
        const question = await QuestionService.getQuestionById(req.params.id);
        if (!question) {
            throw new BadRequestError('Question not found');
        }

        return new SuccessResponse('Question retrieved successfully', question).send(res);
    });

    public static getAllQuestions = asyncHandler(async (req: Request, res: Response) => {
        const queryParams = req.query;
        const filterOptions: any = {};

        if (queryParams.type) filterOptions.type = queryParams.type;
        if (queryParams.category) filterOptions.category = queryParams.category;
        if (queryParams.subCategory) filterOptions.subCategory = queryParams.subCategory;
        if (queryParams.englishLevel) filterOptions.englishLevel = queryParams.englishLevel;
        if (queryParams.difficulty) filterOptions.difficulty = queryParams.difficulty;

        const questions = await QuestionService.getQuestions(filterOptions);

        return new SuccessResponse('Questions retrieved successfully', questions).send(res);
    });

    public static deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
        await QuestionService.deleteQuestion(req.params.id);
        return new SuccessResponse('Question deleted successfully', null).send(res);
    });
}

export default QuestionController; 