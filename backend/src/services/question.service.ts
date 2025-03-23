import { PrismaClient, Status, Question } from "@prisma/client";
import { InternalError, BadRequestError } from "../core/api/ApiError";

const prisma = new PrismaClient();

interface IQuestionContent {
    question: string;
    correctAnswer: string;
    wrongAnswers: string[];
    explanation: string;
}

interface IQuestionMetadata {
    englishLevel: string;
    difficulty: string;
    category: string;
    subCategory: string;
    tags: string[];
    type: string;
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

class QuestionService {
    public static async createQuestion(data: IQuestionCreate): Promise<Question> {
        try {
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

    public static async getQuestions(): Promise<Question[]> {
        try {
            return await prisma.question.findMany({
                where: {
                    status: Status.ACTIVE,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        } catch (error) {
            console.error("Error fetching questions:", error);
            throw new InternalError("Failed to fetch questions");
        }
    }

    public static async getQuestionById(id: string): Promise<Question | null> {
        try {
            const question = await prisma.question.findFirst({
                where: {
                    id,
                    status: Status.ACTIVE,
                },
            });

            if (!question) {
                throw new BadRequestError("Question not found");
            }

            return question;
        } catch (error) {
            if (error instanceof BadRequestError) {
                throw error;
            }
            console.error("Error fetching question:", error);
            throw new InternalError("Failed to fetch question");
        }
    }

    public static async updateQuestion(data: IQuestionUpdate): Promise<Question> {
        const { id, ...updateData } = data;

        try {
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

    public static async deleteQuestion(id: string): Promise<void> {
        try {
            await prisma.question.update({
                where: { id },
                data: { status: Status.INACTIVE },
            });
        } catch (error) {
            console.error("Question deletion error:", error);
            throw new InternalError("Failed to delete question");
        }
    }
}

export default QuestionService; 