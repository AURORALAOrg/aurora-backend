import express from "express";
import rateLimit from "express-rate-limit";
import { sendMessage, getConversationHistory, getUserConversations } from "../../../controllers/chat.controller";
import { sendMessageValidation } from "../../../models/validations/chat.validators";
import validateRequest from "../../../middlewares/validator";
import { isAuthorized } from "../../../middlewares/authentication";

const router = express.Router();

const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each user to 20 requests per windowMs
  message: {
    success: false,
    message: "Too many chat requests. Please wait before sending another message.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return process.env.NODE_ENV === "test";
  },
});

const chatHistoryRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute  
  max: 100, // limit each user to 100 requests per windowMs for history endpoints
  message: {
    success: false,
    message: "Too many requests for chat history. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return process.env.NODE_ENV === "test";
  },
});

router.post(
  "/ai",
  isAuthorized(),
  chatRateLimit,
  validateRequest(sendMessageValidation),
  sendMessage
);

router.get(
  "/conversations",
  chatHistoryRateLimit,
  isAuthorized(),
  getUserConversations
);

router.get(
  "/conversations/:conversationId",
  chatHistoryRateLimit,
  isAuthorized(),
  getConversationHistory
);

export default router;