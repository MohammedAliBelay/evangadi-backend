import { StatusCodes } from "http-status-codes";
import db from "../config/database.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";

dotenv.config();

/**
 * POST /api/auth/forgot-password
 * Send 6-digit OTP to email
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validation
    if (!email) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email is required",
      });
    }

    // 2. Check user
    const [rows] = await db
      .promise()
      .query("SELECT user_id FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 4. Save OTP
    await db
      .promise()
      .query(
        "UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE email = ?",
        [otp, expiry, email]
      );

    // 5. Send OTP email
    await sendEmail({
      to: email,
      subject: "Your Password Reset OTP",
      html: `
        <h3>Password Reset</h3>
        <p>Your OTP is:</p>
        <h2>${otp}</h2>
        <p>This OTP expires in 10 minutes.</p>
    `,
    });

    return res.status(StatusCodes.OK).json({
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Server error",
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password using OTP
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    // 1. Validation
    if (!email || !otp || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email, OTP, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Password must be at least 8 characters",
      });
    }

    // 2. Verify OTP
    const [rows] = await db.promise().query(
      `SELECT user_id FROM users
    WHERE email = ? AND reset_otp = ? AND reset_otp_expiry > ?`,
      [email, otp, Date.now()]
    );

    if (rows.length === 0) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid or expired OTP",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Update password & clear OTP
    await db.promise().query(
      `UPDATE users
    SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL
    WHERE user_id = ?`,
      [hashedPassword, rows[0].user_id]
    );

    return res.status(StatusCodes.OK).json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Server error",
    });
  }
};
