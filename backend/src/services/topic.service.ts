import { PrismaClient, Topic, Prisma } from "@prisma/client";
import { InternalError, BadRequestError, NotFoundError } from "../core/api/ApiError";

const prisma = new PrismaClient();

interface CreateTopicDTO {
  name: string;
  description?: string;
  category: string;
  englishLevel: Topic["englishLevel"];
  prompts: Topic["prompts"];
}

interface UpdateTopicDTO extends Partial<CreateTopicDTO> {
  id: string;
}

export default class TopicService {
  public static async createTopic(data: CreateTopicDTO): Promise<Topic> {
    try {
      return await prisma.topic.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          category: data.category,
          englishLevel: data.englishLevel,
          prompts: data.prompts,
        },
      });
    } catch (error: unknown) {
      console.error("Error creating topic:", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          // If you know the unique constraint (e.g., name), consider making this message more specific.
          throw new BadRequestError("Topic with the same unique field already exists");
        }
        if (error.code === "P2003") {
          // Likely a bad relation reference (e.g., invalid category FK)
          throw new BadRequestError("Invalid relation provided for topic");
        }
      }
      throw new InternalError("Failed to create topic");
    }
  }

  public static async updateTopic(data: UpdateTopicDTO): Promise<Topic> {
    try {
      return await prisma.topic.update({
        where: { id: data.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category && { category: data.category }),
          ...(data.englishLevel && { englishLevel: data.englishLevel }),
          ...(data.prompts && { prompts: data.prompts }),
        },
      });
    } catch (error: unknown) {
      console.error("Error updating topic:", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Topic not found");
        }
        if (error.code === "P2002") {
          throw new BadRequestError("Topic with the same unique field already exists");
        }
        if (error.code === "P2003") {
          throw new BadRequestError("Invalid relation provided for topic");
        }
      }
      throw new InternalError("Failed to update topic");
    }
  }

  public static async deleteTopic(id: string): Promise<Topic> {
    try {
      return await prisma.topic.delete({ where: { id } });
    } catch (error: unknown) {
      console.error("Error deleting topic:", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Topic not found");
        }
        if (error.code === "P2003") {
          throw new BadRequestError("Cannot delete topic with dependent records");
        }
      }
      throw new InternalError("Failed to delete topic");
    }
  }

  public static async getTopicById(id: string): Promise<Topic | null> {
    try {
      return await prisma.topic.findUnique({ where: { id } });
    } catch (error) {
      console.error("Error reading topic:", error);
      throw new InternalError("Failed to read topic");
    }
  }

  public static async listTopics(filter?: { level?: Topic["englishLevel"]; category?: string }): Promise<Topic[]> {
    try {
      const where: Prisma.TopicWhereInput = {};
      if (filter?.level) where.englishLevel = filter.level;
      if (filter?.category) where.category = filter.category;
      return await prisma.topic.findMany({ where, orderBy: { createdAt: "desc" } });
    } catch (error) {
      console.error("Error listing topics:", error);
      throw new InternalError("Failed to list topics");
    }
  }
}


