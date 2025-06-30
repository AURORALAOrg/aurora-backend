import { Router } from "express"
import chatController from "../../../controllers/chat.controller"
import { isAuthorized } from "../../../middlewares/authentication"
import { chatMessageValidator, conversationStartersValidator } from "../../../models/validations/chat.validators"
import rateLimit from "express-rate-limit"
import validateRequest from "../../../middlewares/validator"

// Rate limiting for chat endpoints
const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: "Too many chat requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()

// Public health check
router.get("/health", chatController.healthCheck)

// Protected routes (require authentication)
router.use(isAuthorized())

// Chat endpoints with rate limiting
router.post("/ai", chatRateLimit, validateRequest(chatMessageValidator), chatController.sendMessage)
router.get("/starters", validateRequest(conversationStartersValidator), chatController.getConversationStarters)

export default router
