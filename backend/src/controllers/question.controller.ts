import { Request, Response } from 'express';
import asyncHandler from '../middlewares/async';
import { SuccessResponse } from '../core/api/ApiResponse';
import { BadRequestError } from '../core/api/ApiError';
import QuestionService from '../services/question.service';

export const createQuestion = asyncHandler(async (req: Request, res: Response) => {
    const userId = '67d918fb-f118-8006-a070-6f441b724db0' // res.locals.account.id;
    const question = await QuestionService.createQuestion({
        ...req.body,
        createdBy: userId,
    });

    return new SuccessResponse('Question created successfully', question).send(res);
});

export const getQuestions = asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.query;
    const questions = await QuestionService.getQuestions();
    console.log(questions);
    return new SuccessResponse('Questions retrieved successfully', questions).send(res);
});

export const getQuestionById = asyncHandler(async (req: Request, res: Response) => {
    const question = await QuestionService.getQuestionById(req.params.id);

    if (!question) {
        throw new BadRequestError('Question not found');
    }

    return new SuccessResponse('Question retrieved successfully', question).send(res);
});

export const updateQuestion = asyncHandler(async (req: Request, res: Response) => {
    const question = await QuestionService.updateQuestion({
        id: req.params.id,
        ...req.body,
    });

    return new SuccessResponse('Question updated successfully', question).send(res);
});

export const deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
    await QuestionService.deleteQuestion(req.params.id);

    return new SuccessResponse('Question deleted successfully', null).send(res);
}); 