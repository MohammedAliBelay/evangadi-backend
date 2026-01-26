import express from "express";
import { voteAnswer } from "../controllers/VoteController.js";
import {
  postAnswer,
  getAllAnswer,
  deleteAnswer,
  editAnswer,
} from "../controllers/answerController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();
/**
 * POST /api/answer
 * Protected route
 */

router.post("/vote/:answer_id", authenticateToken, voteAnswer);
router.delete("/:answer_id", authenticateToken, deleteAnswer);
router.put("/:answer_id", authenticateToken, editAnswer);

router.post("/:question_id", authenticateToken, postAnswer);
router.get("/:question_id", getAllAnswer);

export default router;
