import { Request, Response } from 'express';
import { createQuestionValidation, updateQuestionValidation } from '../models/validations/question.validators';
import QuestionService from '../services/question.service';
import { BadRequestError, InternalError } from '../core/api/ApiError';
import { GamificationController } from './gamification.controller';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
    };
}

class QuestionController {
    public static async createQuestion(req: AuthenticatedRequest, res: Response) {
        try {
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

            res.status(201).json({
                status: 'success',
                data: question
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        }
    }

    public static async updateQuestion(req: Request, res: Response) {
        try {
            const { error } = updateQuestionValidation.body.validate(req.body);
            if (error) {
                throw new BadRequestError(error.details[0].message);
            }

            const question = await QuestionService.updateQuestion({
                id: req.params.id,
                ...req.body
            });

            res.status(200).json({
                status: 'success',
                data: question
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        }
    }

    public static async getQuestionById(req: Request, res: Response) {
        try {
            const question = await QuestionService.getQuestionById(req.params.id);
            if (!question) {
                throw new BadRequestError('Question not found');
            }

            res.status(200).json({
                status: 'success',
                data: question
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        }
    }

    public static async getAllQuestions(req: Request, res: Response) {
        try {
            const queryParams = req.query;
            const filterOptions: any = {};

            if (queryParams.type) filterOptions.type = queryParams.type;
            if (queryParams.category) filterOptions.category = queryParams.category;
            if (queryParams.subCategory) filterOptions.subCategory = queryParams.subCategory;
            if (queryParams.englishLevel) filterOptions.englishLevel = queryParams.englishLevel;
            if (queryParams.difficulty) filterOptions.difficulty = queryParams.difficulty;

            const questions = await QuestionService.getQuestions(filterOptions);

            res.status(200).json({
                status: 'success',
                data: questions
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    public static async deleteQuestion(req: Request, res: Response) {
        try {
            await QuestionService.deleteQuestion(req.params.id);
            res.status(204).send();
        } catch (error) {
            if (error instanceof BadRequestError) {
                res.status(400).json({
                    status: 'error',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    message: 'Internal server error'
                });
            }
        }
    }
}

export default QuestionController; 