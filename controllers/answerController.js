import db from "../config/database.js";
import { StatusCodes } from "http-status-codes";

/**
 * Post a new answer for a question
 * Endpoint: POST /api/answer/:question_id
 * Protected route (requires JWT)
 */
export const postAnswer = async (req, res) => {
  const { question_id } = req.params;
  let { answer } = req.body;
  const user_id = req.user?.id;

  if (!user_id) {
    return res
      .status(401)
      .json({ error: "Unauthorized", message: "Authentication required" });
  }

  if (!question_id || isNaN(parseInt(question_id, 10))) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Question ID must be a valid number",
    });
  }

  if (!answer || answer.trim() === "") {
    return res
      .status(400)
      .json({ error: "Bad Request", message: "Please provide answer" });
  }

  answer = answer.trim();

  try {
    const [questionRows] = await db
      .promise()
      .query(
        "SELECT question_id, user_id FROM questions WHERE question_id = ?",
        [question_id]
      );

    if (questionRows.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "The specified question could not be found",
      });
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO answers (question_id, user_id, answer) VALUES (?, ?, ?)",
        [question_id, user_id, answer]
      );

    res.status(201).json({
      message: "Answer posted successfully",
      answer_id: result.insertId,
    });
  } catch (err) {
    console.error("Post answer error:", err);
    res.status(500).json({
      error: "Internal Server Error occured",
      message: "An unexpected error occurred",
    });
  }
};
/**
 * Get all answers for a specific question
 * Endpoint: GET /api/answer/:question_id
 */
export const getAllAnswer = async (req, res) => {
  const question_id = req.params.question_id;
  try {
    const [results] = await db.promise().query(
      `SELECT 
        a.answer_id,
        a.answer,
        a.likes,
        a.dislikes,
        u.username,
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        a.created_at
      FROM answers a
      JOIN users u ON a.user_id = u.user_id
      WHERE a.question_id = ?
      ORDER BY a.created_at ASC`,
      [question_id]
    );

    res.status(200).json({
      message: "Answers retrieved successfully",
      answers: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Get answers error:", error.message);
    res.status(500).json({
      error: "Internal Server Error occured",
      message: "An unexpected error occurred",
    });
  }
};

/**
 * Delete an answer
 * Endpoint: DELETE /api/answer/:id
 */
export const deleteAnswer = async (req, res) => {
  const userId = req.user?.id;
  const answer_id = req.params.answer_id;

  try {
    const [answer] = await db
      .promise()
      .query("SELECT user_id FROM answers WHERE answer_id = ?", [answer_id]);

    if (answer.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Not Found", msg: "Answer not found" });
    }

    if (answer[0].user_id !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: "Forbidden",
        msg: "You are not authorized to delete this answer",
      });
    }
    await db
      .promise()
      .query("DELETE FROM answers WHERE answer_id = ?", [answer_id]);
    res.status(StatusCodes.OK).json({ msg: "Answer deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      msg: "An unexpected error occurred",
    });
  }
};

/**
 * Edit an existing answer
 * Endpoint: PUT /api/answer/:id
 */

export const editAnswer = async (req, res) => {
  const user_id = req.user?.id;
  const answer_id = req.params.answer_id;
  const { answer } = req.body;

  if (!answer || !answer.trim()) {
    return res.status(400).json({ msg: "Answer cannot be empty" });
  }

  const [rows] = await db
    .promise()
    .query("SELECT user_id FROM answers WHERE answer_id = ?", [answer_id]);

  if (!rows.length) return res.status(404).json({ msg: "Answer not found" });
  if (rows[0].user_id !== user_id)
    return res.status(403).json({ msg: "Forbidden" });

  await db
    .promise()
    .query("UPDATE answers SET answer = ? WHERE answer_id = ?", [
      answer,
      answer_id,
    ]);

  res.json({ msg: "Answer updated" });
};

