import express from "express";
import { isAuthorized } from "../../../middlewares/authentication";
import validateRequest from "../../../middlewares/validator";
import {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
} from "../../../controllers/question.controller";
import {
    createQuestionValidation,
    updateQuestionValidation,
} from "../../../models/validations/question.validators";

const router = express.Router();

// Protected routes (require authentication)
// router.use(isAuthorized());

// Question routes
router.post("/", validateRequest(createQuestionValidation), createQuestion);
router.get("/", getQuestions);
router.get("/:id", getQuestionById);
router.put("/:id", validateRequest(updateQuestionValidation), updateQuestion);
router.delete("/:id", deleteQuestion);

export default router; 