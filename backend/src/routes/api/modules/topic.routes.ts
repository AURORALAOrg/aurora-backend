import express from "express";
import TopicController from "../../../controllers/topic.controller";
import validateRequest from "../../../middlewares/validator";
import { isAuthorized } from "../../../middlewares/authentication";
import {
  createTopicValidation,
  updateTopicValidation,
  getTopicsQueryValidation,
  getTopicsByLevelValidation,
  getTopicByIdValidation,
  deleteTopicValidation,
} from "../../../models/validations/topic.validators";

const router = express.Router();

// Management endpoints (could be admin-protected later)
router.post("/", isAuthorized(), validateRequest(createTopicValidation), TopicController.create);
router.put("/:id", isAuthorized(), validateRequest(updateTopicValidation), TopicController.update);
router.delete("/:id", isAuthorized(), validateRequest(deleteTopicValidation), TopicController.remove);

// Public read endpoints
router.get("/", isAuthorized(), validateRequest(getTopicsQueryValidation), TopicController.list);
// Place the id route before the level route to avoid shadowing
router.get("/id/:id", isAuthorized(), validateRequest(getTopicByIdValidation), TopicController.getById);
router.get("/:level", isAuthorized(), validateRequest(getTopicsByLevelValidation), TopicController.getByLevel);

export default router;


