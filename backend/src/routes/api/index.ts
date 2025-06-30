import { Router } from "express"
import authRoutes from "./modules/auth.routes"
import accountRoutes from "./modules/account.routes"
import walletRoutes from "./modules/wallet.routes"
import questionRoutes from "./modules/question.routes"
import chatRoutes from "./modules/chat.routes"
import topicRoutes from "./modules/topic.routes"

const router = Router()

// API Routes
router.use("/auth", authRoutes)
router.use("/account", accountRoutes)
router.use("/wallet", walletRoutes)
router.use("/questions", questionRoutes)
router.use("/chat", chatRoutes)
router.use("/topics", topicRoutes)

export default router
