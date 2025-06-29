import { Router } from "express"
import rateLimit from "express-rate-limit"
import ChatController from "../../../controllers/chat.controller"
import { isAuthorized } from "../../../middlewares/authentication"
import { chatMessageSchema } from "../../../models/validations/chat.validators"
import serverSettings from "../../../core/config/settings"
import validateRequest from "../../../middlewares/validator"

const router = Router()

// Rate limiting specifically for chat endpoints
const chatRateLimit = rateLimit({
  windowMs: serverSettings.chat.rateLimitWindow, // 15 minutes
  max: serverSettings.chat.rateLimitMax, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: "Too many chat requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Apply rate limiting to all chat routes
router.use(chatRateLimit)

// Health check endpoint (no auth required)
router.get("/health", ChatController.healthCheck)

// Protected routes (require authentication)
router.use(isAuthorized())

// Send message to AI
router.post("/ai", validateRequest(chatMessageSchema), ChatController.sendMessage)

// Get conversation starters
router.get("/starters", ChatController.getConversationStarters)

export default router
