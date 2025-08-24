import { Request, Response } from 'express';
import { createQuestionValidation, updateQuestionValidation } from '../models/validations/question.validators';
import QuestionService from '../services/question.service';
import { XPService } from '../services/xp.service';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../core/api/ApiError';
import asyncHandler from '../middlewares/async';
import { SuccessResponse, BadRequestResponse, CreatedResponse, PaginatedResponse } from '../core/api/ApiResponse';
import type { AuthenticatedRequest } from '../middlewares/authentication';


interface QuestionContent {
    correctAnswer?: string | number
}
interface GameMeta {
    timeLimit?: number
}

class QuestionController {
    public static createQuestion = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { error } = createQuestionValidation.body.validate(req.body);
        if (error) {
            throw new BadRequestError(error.details[0].message);
        }

        if (!req.user?.id) {
            throw new UnauthorizedError('User not authenticated');
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
            throw new NotFoundError('Question not found');
        }

        return new SuccessResponse('Question retrieved successfully', question).send(res);
    });

    public static getAllQuestions = asyncHandler(async (req: Request, res: Response) => {
        const queryParams = req.query;
        const filterOptions: any = {};

        // Add validated filter options
        if (queryParams.type) filterOptions.type = queryParams.type;
        if (queryParams.category) filterOptions.category = queryParams.category;
        if (queryParams.subCategory) filterOptions.subCategory = queryParams.subCategory;
        if (queryParams.englishLevel) filterOptions.englishLevel = queryParams.englishLevel;
        if (queryParams.difficulty) filterOptions.difficulty = queryParams.difficulty;

        // Add pagination options
        const page = Math.max(1, Number.parseInt(queryParams.page as string, 10) || 1);
        const limitRaw = Number.parseInt(queryParams.limit as string, 10);
        const limit = Math.min(100, isNaN(limitRaw) ? 20 : Math.max(1, limitRaw));

        // Get questions and total count
        const [questions, totalCount] = await Promise.all([
            QuestionService.getQuestions(filterOptions, { page, limit }),
            QuestionService.getTotalCount(filterOptions)
        ]);

        return new PaginatedResponse("Questions retrieved successfully", questions, {
            page,
            limit,
            count: questions.length,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
        }).send(res);
    });

public static deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
    await QuestionService.deleteQuestion(req.params.id);
    return new SuccessResponse("Question deleted successfully", null).send(res);
  });

  // NEW: submitAnswer (kept, but aligned to asyncHandler + ApiResponse)
  public static submitAnswer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.id) throw new UnauthorizedError("Unauthorized - User not authenticated");

    const { questionId, answer, timeSpent } = req.body ?? {};
    if (typeof questionId !== "string" || !questionId.trim() || typeof answer === "undefined" || timeSpent == null) {
      throw new BadRequestError("Missing required fields: questionId, answer, timeSpent");
    }
    if (typeof timeSpent !== "number" || !Number.isFinite(timeSpent) || timeSpent < 0) {
      throw new BadRequestError("Invalid timeSpent");
    }

    const q = await QuestionService.getQuestionById(questionId);
    if (!q) throw new NotFoundError("Question not found");

    const content = q.content as Partial<QuestionContent>;
    const norm = (v: unknown): any => {
        if (v == null) return null;
        if (Array.isArray(v)) return v.map(norm);
        if (typeof v === 'number') return v.toString();
        if (typeof v === 'string') return v.trim().toLowerCase();
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return String(v);
    };
    const expected = content?.correctAnswer;
    const equals = (exp: unknown, act: unknown) => {
        const e = norm(exp);
        const a = norm(act);
        return Array.isArray(e) ? e.some(x => x === a) : e === a;
    };
    const isCorrect = equals(expected, answer);

    const meta = (q.gameMetadata ?? {}) as Partial<GameMeta>;
    const timeLimit: number = typeof meta.timeLimit === "number" && meta.timeLimit > 0 ? meta.timeLimit : 30;
    const effectiveTime = Math.max(0, Math.min(timeSpent, timeLimit));
    const xpResult = await XPService.awardXP(
        req.user.id,
        questionId,
        isCorrect,
        effectiveTime,
        timeLimit
    );

    return new SuccessResponse("Answer submitted", { isCorrect, xpResult }).send(res);
  });
}

export default QuestionController;