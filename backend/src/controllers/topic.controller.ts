import { Request, Response } from "express";
import { SuccessResponse } from "../core/api/ApiResponse";
import { BadRequestError, NotFoundError } from "../core/api/ApiError";
import TopicService from "../services/topic.service";
import asyncHandler from "../middlewares/async";

export default class TopicController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    const topic = await TopicService.createTopic(req.body);
    return new SuccessResponse("Topic created successfully", { topic }).send(res);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const topic = await TopicService.updateTopic({ id: req.params.id, ...req.body });
    return new SuccessResponse("Topic updated successfully", { topic }).send(res);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    await TopicService.deleteTopic(req.params.id);
    return new SuccessResponse("Topic deleted successfully", {}).send(res);
  });

  static list = asyncHandler(async (req: Request, res: Response) => {
    const { level, category } = req.query as { level?: string; category?: string };
    const topics = await TopicService.listTopics({ 
      level: level as any, 
      category 
    });
    return new SuccessResponse("Topics retrieved successfully", { topics }).send(res);
  });

  static getByLevel = asyncHandler(async (req: Request, res: Response) => {
    const { level } = req.params as { level: string };
    const { category } = req.query as { category?: string };
    const topics = await TopicService.listTopics({ 
      level: level as any, 
      category 
    });
    return new SuccessResponse("Topics retrieved successfully", { topics }).send(res);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const topic = await TopicService.getTopicById(req.params.id);
    if (!topic) throw new NotFoundError("Topic not found");
    return new SuccessResponse("Topic retrieved successfully", { topic }).send(res);
  });
}


