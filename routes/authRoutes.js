import express from "express";
import { registerLimiter, loginLimiter } from "../middleware/rateLimiter.js";
const router = express.Router();
import {
  registerUser,
  loginUser,
  checkUser,
  resetPassword,
  verifyResetToken,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

// Public routes
router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/reset-password", resetPassword);
router.post("/verify-reset-token", verifyResetToken);

// Protected route to check user authentication status
router.get("/check-user", authenticateToken, checkUser);

export default router;
