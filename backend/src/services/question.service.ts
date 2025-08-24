import { Status, Question } from "@prisma/client";
import { InternalError, BadRequestError } from "../core/api/ApiError";
import { prisma } from "../lib/prisma";

interface IQuestionContent {
    // Multiple choice fields
    question?: string;
    correctAnswer?: string;
    wrongAnswers?: string[];
    explanation?: string;
    // Sentence builder fields
    sentence?: string;
    words?: string[];
    // Fill in the blanks fields
    hint?: string;
}

interface IQuestionMetadata {
    englishLevel: string;
    difficulty: string;
    category: string;
    subCategory: string;
    tags: string[];
    type: 'multiple-choice' | 'sentence-builder' | 'fill-in-blanks';
}

interface IGameMetadata {
    pointsValue: number;
    timeLimit: number;
    difficultyMultiplier: number;
}

interface IQuestionCreate {
    content: IQuestionContent;
    metadata: IQuestionMetadata;
    gameMetadata: IGameMetadata;
    createdBy: string;
}

interface IQuestionUpdate extends Partial<IQuestionCreate> {
    id: string;
}

interface IQuestionQuery {
    type?: IQuestionMetadata['type'];
    category?: string;
    subCategory?: string;
    englishLevel?: string;
    difficulty?: string;
}

interface IPaginationOptions {
    page: number;
    limit: number;
}

class QuestionService {
    private static buildWhereClause(query: IQuestionQuery): any {
        const where: any = { status: Status.ACTIVE };
        
        // Build array of metadata filters
        const metadataFilters: any[] = [];
        
        if (query.type) {
            metadataFilters.push({ path: ['type'], equals: query.type });
        }
        if (query.category) {
            metadataFilters.push({ path: ['category'], equals: query.category });
        }
        if (query.subCategory) {
            metadataFilters.push({ path: ['subCategory'], equals: query.subCategory });
        }
        if (query.englishLevel) {
            metadataFilters.push({ path: ['englishLevel'], equals: query.englishLevel });
        }
        if (query.difficulty) {
            metadataFilters.push({ path: ['difficulty'], equals: query.difficulty });
        }
        
        if (metadataFilters.length > 0) {
            where.AND = metadataFilters.map(filter => ({ metadata: filter }));
        }
        
        return where;
    }

    public static async createQuestion(data: IQuestionCreate): Promise<Question> {
        try {
            // Validate content based on type
            switch (data.metadata.type) {
                case 'multiple-choice':
                    if (!data.content.question || !data.content.correctAnswer || !data.content.wrongAnswers || !data.content.explanation) {
                        throw new BadRequestError('Missing required fields for multiple-choice question');
                    }
                    break;
                case 'sentence-builder':
                    if (!data.content.sentence || !data.content.words || !data.content.explanation) {
                        throw new BadRequestError('Missing required fields for sentence builder question');
                    }
                    break;
                case 'fill-in-blanks':
                    if (!data.content.sentence || !data.content.correctAnswer || !data.content.explanation) {
                        throw new BadRequestError('Missing required fields for fill-in-blanks question');
                    }
                    break;
            }

            return await prisma.$transaction(async (tx) => {
                const question = await tx.question.create({
                    data: {
                        content: data.content as any,
                        metadata: data.metadata as any,
                        gameMetadata: data.gameMetadata as any,
                        createdBy: data.createdBy,
                        status: Status.ACTIVE,
                    },
                });
                return question;
            });
        } catch (error) {
            console.error("Question creation error:", error);
            throw new InternalError("Failed to create question");
        }
    }

    public static async updateQuestion(data: IQuestionUpdate): Promise<Question> {
        const { id, ...updateData } = data;

        try {
            // If updating content and metadata, validate based on type
            if (updateData.content && updateData.metadata) {
                switch (updateData.metadata.type) {
                    case 'multiple-choice':
                        if (updateData.content.question || updateData.content.correctAnswer ||
                            updateData.content.wrongAnswers || updateData.content.explanation) {
                            if (!updateData.content.question || !updateData.content.correctAnswer ||
                                !updateData.content.wrongAnswers || !updateData.content.explanation) {
                                throw new BadRequestError('Missing required fields for multiple-choice question');
                            }
                        }
                        break;
                    case 'sentence-builder':
                        if (updateData.content.sentence || updateData.content.words || updateData.content.explanation) {
                            if (!updateData.content.sentence || !updateData.content.words || !updateData.content.explanation) {
                                throw new BadRequestError('Missing required fields for sentence builder question');
                            }
                        }
                        break;
                    case 'fill-in-blanks':
                        if (updateData.content.sentence || updateData.content.correctAnswer ||
                            updateData.content.explanation) {
                            if (!updateData.content.sentence || !updateData.content.correctAnswer ||
                                !updateData.content.explanation) {
                                throw new BadRequestError('Missing required fields for fill-in-blanks question');
                            }
                        }
                        break;
                }
            }

            return await prisma.$transaction(async (tx) => {
                const question = await tx.question.update({
                    where: { id },
                    data: {
                        ...(updateData.content && { content: updateData.content as any }),
                        ...(updateData.metadata && { metadata: updateData.metadata as any }),
                        ...(updateData.gameMetadata && { gameMetadata: updateData.gameMetadata as any }),
                        ...(updateData.createdBy && { createdBy: updateData.createdBy }),
                    },
                });
                return question;
            });
        } catch (error) {
            console.error("Question update error:", error);
            throw new InternalError("Failed to update question");
        }
    }

    public static async getQuestionById(id: string): Promise<Question | null> {
        try {
            return await prisma.question.findUnique({
                where: { id },
            });
        } catch (error) {
            console.error("Error fetching question:", error);
            throw new InternalError("Failed to fetch question");
        }
    }

    public static async getQuestions(query: IQuestionQuery = {}, pagination?: IPaginationOptions): Promise<Question[]> {
        try {
            const where = this.buildWhereClause(query);
            const findManyOptions: any = { where };

            // Add pagination if provided
            if (pagination) {
                const offset = (pagination.page - 1) * pagination.limit;
                findManyOptions.skip = offset;
                findManyOptions.take = pagination.limit;
            }

            return await prisma.question.findMany(findManyOptions);
        } catch (error) {
            console.error("Error fetching questions:", error);
            throw new InternalError("Failed to fetch questions");
        }
    }

    public static async getTotalCount(query: IQuestionQuery = {}): Promise<number> {
        try {
            const where = this.buildWhereClause(query);
            return await prisma.question.count({ where });
        } catch (error) {
            console.error("Error fetching total count:", error);
            throw new InternalError("Failed to fetch total count");
        }
    }

    public static async deleteQuestion(id: string): Promise<Question> {
        try {
            return await prisma.question.update({
                where: { id },
                data: { status: Status.INACTIVE },
            });
        } catch (error) {
            console.error("Error deleting question:", error);
            throw new InternalError("Failed to delete question");
        }
    }
}

export default QuestionService; 