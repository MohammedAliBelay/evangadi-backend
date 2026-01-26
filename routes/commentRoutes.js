import express from "express";
import { postComment } from "../controllers/commentController.js";
import { getComments } from "../controllers/commentController.js";
import { deleteComment } from "../controllers/commentController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticateToken, postComment);
router.get("/:answerid", getComments);
router.delete("/:commentid", authenticateToken, deleteComment);
export default router;
