import { Request, Response } from 'express';
import asyncHandler from '../middlewares/async';
import { SuccessResponse } from '../core/api/ApiResponse';
import { BadRequestError } from '../core/api/ApiError';
import SentenceOrderingService from '../services/sentence-ordering.service';

export const createExercise = asyncHandler(async (req: Request, res: Response) => {
    const userId = res.locals.account.id;
    const exercise = await SentenceOrderingService.createExercise({
        ...req.body,
        createdBy: userId,
    });

    return new SuccessResponse('Exercise created successfully', exercise).send(res);
});

export const getExercises = asyncHandler(async (req: Request, res: Response) => {
    const exercises = await SentenceOrderingService.getExercises();

    return new SuccessResponse(
        'Exercises retrieved successfully',
        exercises
    ).send(res);
});

export const getExerciseById = asyncHandler(async (req: Request, res: Response) => {
    const exercise = await SentenceOrderingService.getExerciseById(req.params.id);

    if (!exercise) {
        throw new BadRequestError('Exercise not found');
    }

    return new SuccessResponse(
        'Exercise retrieved successfully',
        exercise
    ).send(res);
});

export const updateExercise = asyncHandler(async (req: Request, res: Response) => {
    const exercise = await SentenceOrderingService.updateExercise({
        id: req.params.id,
        ...req.body,
    });

    return new SuccessResponse('Exercise updated successfully', exercise).send(res);
});

export const deleteExercise = asyncHandler(async (req: Request, res: Response) => {
    await SentenceOrderingService.deleteExercise(req.params.id);

    return new SuccessResponse('Exercise deleted successfully', null).send(res);
}); 