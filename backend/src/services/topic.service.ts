import { PrismaClient, Topic } from "@prisma/client";
import { InternalError } from "../core/api/ApiError";

const prisma = new PrismaClient();

interface CreateTopicDTO {
  name: string;
  description?: string;
  category: string;
  englishLevel: string;
  prompts: string[];
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
          prompts: data.prompts as any,
        },
      });
    } catch (error) {
      console.error("Error creating topic:", error);
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
          ...(data.prompts && { prompts: data.prompts as any }),
        },
      });
    } catch (error) {
      console.error("Error updating topic:", error);
      throw new InternalError("Failed to update topic");
    }
  }

  public static async deleteTopic(id: string): Promise<Topic> {
    try {
      return await prisma.topic.delete({ where: { id } });
    } catch (error) {
      console.error("Error deleting topic:", error);
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

  public static async listTopics(filter?: { level?: string; category?: string }): Promise<Topic[]> {
    try {
      const where: any = {};
      if (filter?.level) where.englishLevel = filter.level;
      if (filter?.category) where.category = filter.category;
      return await prisma.topic.findMany({ where, orderBy: { createdAt: "desc" } });
    } catch (error) {
      console.error("Error listing topics:", error);
      throw new InternalError("Failed to list topics");
    }
  }
}


