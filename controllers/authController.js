import bcrypt from "bcryptjs";
import db from "../config/database.js";
import dotenv from "dotenv";
import generateToken from "../utils/generateToken.js";
dotenv.config();
import nodemailer from "nodemailer";
import crypto from "crypto";
import { StatusCodes } from "http-status-codes";


/**
 * Helper: Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Register a new user
 * Endpoint: POST /api/user/register
 */
export const registerUser = async (req, res) => {
  try {
    // Extract user details from request body
    const { username, first_name, last_name, email, password } = req.body;

    // 1. Validate required fields
    if (!username || !first_name || !last_name || !email || !password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide all required fields",
      });
    }

    // 2. Validate email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid email format",
      });
    }

    // 3. Validate username length
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Username must be 3-20 characters long",
      });
    }

    // 4. Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Password must be at least 8 characters",
      });
    }

    // 5. Check if user exists
    const [existingUser] = await db
      .promise()
      .query("SELECT user_id FROM users WHERE username = ? OR email = ?", [
        username,
        email,
      ]);

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "User already existed",
      });
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Insert user into database
    await db
      .promise()
      .query(
        "INSERT INTO users (username, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?)",
        [username, first_name, last_name, email, hashedPassword]
      );

    // 8. Success response
    res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Register user error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

// /**
//  * Login user
//  * Endpoint: POST /api/user/login
//  */

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please provide all required fields",
    });
  }

  // 2. Validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid email format",
    });
  }

  try {
    // 2. Fetch user by email
    const [rows] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid username or password",
      });
    }

    // 3. Compare passwords
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid username or password",
      });
    }

    // 4. Reset rate limiter
    res.locals.loginSuccess = true;

    // 5. Generate token
    const token = generateToken(user);

    // 8. Success response
    return res.status(200).json({
      message: "User login successful",
      token,
      user: {
        id: user.user_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

// Check user authentication status
export const checkUser = (req, res) => {
  // Logic to check user status
  const { username, userid } = req.user; // Extract user info from request object

  res
    .status(StatusCodes.OK)
    .json({ msg: "User is authenticated", username, userid });
};

// Reset password
export const resetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Please provide an email address",
    });
  }

  try {
    const [user] = await dbConnection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "User not found with this email",
      });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save the hashed token and expiration time in the database
    const expirationTime = new Date(Date.now() + 3600000); // Token valid for 1 hour
    await dbConnection.query(
      "UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE email = ?",
      [hashedToken, expirationTime, email]
    );

    // Send email with reset link
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
              <a href="${resetLink}" target="_blank">${resetLink}</a>
              <p>If you did not request this, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(StatusCodes.OK).json({
      msg: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Server error",
    });
  }
};
// Verify reset token and update password
export const verifyResetToken = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Please provide a valid token and new password",
    });
  }

  if (newPassword.length < 8) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Password should be at least 8 characters",
    });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const [user] = await dbConnection.query(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > ?",
      [hashedToken, new Date()]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        msg: "Invalid or expired reset token",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await dbConnection.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE reset_token = ?",
      [hashedPassword, hashedToken]
    );

    return res.status(StatusCodes.OK).json({
      msg: "Password updated successfully",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Server error",
    });
  }
};
