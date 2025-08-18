import { Request, Response } from 'express';
import { createQuestionValidation, updateQuestionValidation } from '../models/validations/question.validators';
import QuestionService from '../services/question.service';
import { XPService } from '../services/xp.service';
import { BadRequestError, UnauthorizedError } from '../core/api/ApiError';

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

            // Add validated filter options
            if (queryParams.type) filterOptions.type = queryParams.type;
            if (queryParams.category) filterOptions.category = queryParams.category;
            if (queryParams.subCategory) filterOptions.subCategory = queryParams.subCategory;
            if (queryParams.englishLevel) filterOptions.englishLevel = queryParams.englishLevel;
            if (queryParams.difficulty) filterOptions.difficulty = queryParams.difficulty;

            // Add pagination options
            const page = parseInt(queryParams.page as string) || 1;
            const limit = parseInt(queryParams.limit as string) || 20;

            // Get questions and total count
            const [questions, totalCount] = await Promise.all([
                QuestionService.getQuestions(filterOptions, { page, limit }),
                QuestionService.getTotalCount(filterOptions)
            ]);

            res.status(200).json({
                status: 'success',
                data: questions,
                pagination: {
                    page,
                    limit,
                    count: questions.length,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
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

public static async submitAnswer(req: AuthenticatedRequest, res: Response) {
     // logger.debug('Submit answer', { userId: req.user?.id, questionId: req.body?.questionId }); 
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Unauthorized - User not authenticated');
      }

      const { questionId, answer, timeSpent } = req.body ?? {};
      if (!questionId || typeof answer === 'undefined' || timeSpent == null) {
        throw new BadRequestError('Missing required fields: questionId, answer, timeSpent');
      }
      if (typeof timeSpent !== 'number' || timeSpent < 0) {
        throw new BadRequestError('Invalid timeSpent');
      }

      // Fetch question via service (reuse shared Prisma client)
      const q = await QuestionService.getQuestionById(questionId);
      if (!q) throw new BadRequestError('Question not found');

      const content = q.content as any;
      const isCorrect = content?.correctAnswer === answer;

      // Pull timeLimit from gameMetadata; use a safe fallback
      const meta = (q.gameMetadata as any) ?? {};
      const timeLimit: number = typeof meta.timeLimit === 'number' && meta.timeLimit > 0 ? meta.timeLimit : 30;

      // Award XP (5-arg signature)
      const xpResult = await XPService.awardXP(req.user.id, questionId, isCorrect, timeSpent, timeLimit);

      res.status(200).json({
        status: 'success',
        data: { isCorrect, xpResult },
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({ status: 'error', message: error.message });
      } else if (error instanceof BadRequestError) {
        res.status(400).json({ status: 'error', message: error.message });
      } else {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
      }
    }
  }
}

export default QuestionController;