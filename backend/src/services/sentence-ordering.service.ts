import { PrismaClient, Status, SentenceOrdering } from "@prisma/client";
import { InternalError, BadRequestError } from "../core/api/ApiError";

const prisma = new PrismaClient();

interface ISentenceOrderingContent {
    sentence: string;
    words: string[];
    explanation: string;
}

interface ISentenceOrderingMetadata {
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

interface ISentenceOrderingCreate {
    content: ISentenceOrderingContent;
    metadata: ISentenceOrderingMetadata;
    gameMetadata: IGameMetadata;
    createdBy: string;
}

interface ISentenceOrderingUpdate extends Partial<ISentenceOrderingCreate> {
    id: string;
}

class SentenceOrderingService {
    public static async createExercise(data: ISentenceOrderingCreate): Promise<SentenceOrdering> {
        try {
            return await prisma.$transaction(async (tx) => {
                const exercise = await tx.sentenceOrdering.create({
                    data: {
                        content: data.content as any,
                        metadata: data.metadata as any,
                        gameMetadata: data.gameMetadata as any,
                        createdBy: data.createdBy,
                        status: Status.ACTIVE,
                    },
                });
                return exercise;
            });
        } catch (error) {
            console.error("Exercise creation error:", error);
            throw new InternalError("Failed to create sentence ordering exercise");
        }
    }

    public static async getExercises(): Promise<SentenceOrdering[]> {
        try {
            return await prisma.sentenceOrdering.findMany({
                where: {
                    status: Status.ACTIVE,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        } catch (error) {
            console.error("Error fetching exercises:", error);
            throw new InternalError("Failed to fetch sentence ordering exercises");
        }
    }

    public static async getExerciseById(id: string): Promise<SentenceOrdering | null> {
        try {
            const exercise = await prisma.sentenceOrdering.findFirst({
                where: {
                    id,
                    status: Status.ACTIVE,
                },
            });

            if (!exercise) {
                throw new BadRequestError("Sentence ordering exercise not found");
            }

            return exercise;
        } catch (error) {
            if (error instanceof BadRequestError) {
                throw error;
            }
            console.error("Error fetching exercise:", error);
            throw new InternalError("Failed to fetch sentence ordering exercise");
        }
    }

    public static async updateExercise(data: ISentenceOrderingUpdate): Promise<SentenceOrdering> {
        const { id, ...updateData } = data;

        try {
            return await prisma.$transaction(async (tx) => {
                const exercise = await tx.sentenceOrdering.update({
                    where: { id },
                    data: {
                        ...(updateData.content && { content: updateData.content as any }),
                        ...(updateData.metadata && { metadata: updateData.metadata as any }),
                        ...(updateData.gameMetadata && { gameMetadata: updateData.gameMetadata as any }),
                        ...(updateData.createdBy && { createdBy: updateData.createdBy }),
                    },
                });
                return exercise;
            });
        } catch (error) {
            console.error("Exercise update error:", error);
            throw new InternalError("Failed to update sentence ordering exercise");
        }
    }

    public static async deleteExercise(id: string): Promise<void> {
        try {
            await prisma.sentenceOrdering.update({
                where: { id },
                data: { status: Status.INACTIVE },
            });
        } catch (error) {
            console.error("Exercise deletion error:", error);
            throw new InternalError("Failed to delete sentence ordering exercise");
        }
    }
}

export default SentenceOrderingService; 