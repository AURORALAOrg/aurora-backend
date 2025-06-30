import { Router } from "express"
import topicController from "../../../controllers/topic.controller"
import { isAuthorized } from "../../../middlewares/authentication"
import validateRequest from "../../../middlewares/validator"
import { createTopicValidator, getRandomPromptsValidator, getTopicsValidator, updateTopicValidator } from "../../../models/validations/topic.validators"

const router = Router()

// Public routes (for getting topics and categories)
router.get("/categories", topicController.getCategories)
router.get("/levels", topicController.getLevels)

// Protected routes (require authentication)
router.use(isAuthorized()) // Apply authentication to all routes below

// Topic CRUD operations
router.post("/", validateRequest(createTopicValidator), topicController.createTopic)
router.get("/", validateRequest(getTopicsValidator), topicController.getTopics)
router.get("/prompts/random", validateRequest(getRandomPromptsValidator), topicController.getRandomPrompts)
router.get("/level/:level", topicController.getTopicsByLevel)
router.get("/category/:category", topicController.getTopicsByCategory)
router.get("/:id", topicController.getTopicById)
router.put("/:id", validateRequest(updateTopicValidator), topicController.updateTopic)
router.delete("/:id", topicController.deleteTopic)

export default router
