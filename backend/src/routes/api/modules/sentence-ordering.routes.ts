import express from "express";
import { isAuthorized } from "../../../middlewares/authentication";
import validateRequest from "../../../middlewares/validator";
import {
    createExercise,
    getExercises,
    getExerciseById,
    updateExercise,
    deleteExercise,
} from "../../../controllers/sentence-ordering.controller";
import {
    createSentenceOrderingValidation,
    updateSentenceOrderingValidation,
} from "../../../models/validations/sentence-ordering.validators";

const router = express.Router();

// Protected routes (require authentication)
router.use(isAuthorized());

// Sentence ordering exercise routes
router.post("/", validateRequest(createSentenceOrderingValidation), createExercise);
router.get("/", getExercises);
router.get("/:id", getExerciseById);
router.put("/:id", validateRequest(updateSentenceOrderingValidation), updateExercise);
router.delete("/:id", deleteExercise);

export default router; 