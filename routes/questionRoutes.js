import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  getAllQuestions,
  postQuestion,
  getQuestionById,
  editQuestion,
  deleteQuestion,
} from "../controllers/questionController.js";

const router = express.Router();

// Public routes
router.get("/", getAllQuestions);
router.get("/:question_id", getQuestionById);

// Protected routes
router.post("/", authenticateToken, postQuestion);
router.patch("/:question_id", authenticateToken, editQuestion);
router.delete("/:question_id", authenticateToken, deleteQuestion);

export default router;
