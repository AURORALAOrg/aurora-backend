import { Router } from "express"
import authRoutes from "./modules/auth.routes"
import accountRoutes from "./modules/account.routes"
import questionRoutes from "./modules/question.routes"
import walletRoutes from "./modules/wallet.routes"
import chatRoutes from "./modules/chat.routes"

const router = Router()

// API Routes
router.use("/auth", authRoutes)
router.use("/account", accountRoutes)
router.use("/questions", questionRoutes)
router.use("/wallet", walletRoutes)
router.use("/chat", chatRoutes)

export default router
