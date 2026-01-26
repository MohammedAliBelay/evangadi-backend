import db from "../config/database.js";

/**
 * Get all questions
 * Endpoint: GET /api/question/
 */

export const getAllQuestions = async (req, res) => {
  try {
    // 1. Fetch all questions from the database
    const [rows] = await db.promise().query(`
  SELECT 
    q.*,
    u.username,
    u.first_name,
    u.last_name
  FROM questions q
  LEFT JOIN users u ON q.user_id = u.user_id
  ORDER BY q.created_at DESC
`);

    // 2. Check if question exists
    if (rows.length === 0) {
      return res.status(200).json({
        error: "No Content",
        message: "No questions found.",
      });
    }
    // 2. Send response
    res.status(200).json({ questions: rows });
  } catch (err) {
    console.error("Get all questions error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

/**
 * Get single question by ID
 * Endpoint: GET /api/question/:question_id
 */
export const getQuestionById = async (req, res) => {
  const { question_id } = req.params;
  const questionIdNum = parseInt(question_id, 10);
  if (isNaN(questionIdNum)) {
    return res
      .status(400)
      .json({ error: "Question ID must be a valid number" });
  }

  try {
    // 1. Fetch question by ID
    const [rows] = await db
      .promise()
      .query(
        "SELECT question_id, title, description, user_id FROM questions WHERE question_id = ?",
        [questionIdNum]
      );

    // 2. Check if question exists
    if (rows.length === 0)
      return res.status(404).json({
        error: "Not Found",
        message: "The requested question could not be found.",
      });
    // 3. Send response

    res.status(200).json({ question: rows[0] });
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

/**
 * Post a new question
 * Endpoint: POST /api/question/
 * Protected route (JWT protected)
 */
export const postQuestion = async (req, res) => {
  let { title, description } = req.body;

  // 1. Extract user ID from JWT
  const user_id = req.user?.id;
  if (!user_id) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // 2. Trim input
  title = title?.trim();
  description = description?.trim();

  if (!title || !description) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please provide all required fields",
    });
  }

  try {
    // 4. Insert question into database
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO questions (user_id, title, description) VALUES (?, ?, ?)",
        [user_id, title, description]
      );

    // 5. Send success response
    res.status(201).json({
      message: "Question created successfully",
      question_id: result.insertId,
    });
  } catch (err) {
    console.error("Post question error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

/**
 * Edit a question
 * Endpoint: PATCH /api/question/:question_id
 * Protected route (JWT required)
 */
export const editQuestion = async (req, res) => {
  const { question_id } = req.params;
  let { title, description } = req.body;
  const user_id = req.user?.id;
  // Validate input
  if (!title || !description) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please provide both title and description",
    });
  }
  const questionIdNum = parseInt(question_id, 10);
  if (isNaN(questionIdNum)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Question ID must be a valid number",
    });
  }

  try {
    // Check if question exists and belongs to user
    const [rows] = await db
      .promise()
      .query("SELECT user_id FROM questions WHERE question_id = ?", [
        questionIdNum,
      ]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Question not found",
      });
    }
    if (rows[0].user_id !== user_id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not allowed to edit this question",
      });
    }
    // Update question
    await db
      .promise()
      .query(
        "UPDATE questions SET title = ?, description = ?, updated_at = NOW() WHERE question_id = ?",
        [title.trim(), description.trim(), questionIdNum]
      );
    res.status(200).json({
      message: "Question updated successfully",
    });
  } catch (err) {
    console.error("Edit question error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

/**
 * Delete a question
 * Endpoint: DELETE /api/question/:question_id
 * Protected route (JWT required)
 */
export const deleteQuestion = async (req, res) => {
  const { question_id } = req.params;
  const userId = req.user?.id;

  const questionId = Number(question_id);
  if (!Number.isInteger(questionId)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Question ID must be a valid number",
    });
  }

  try {
    // 1. Verify question exists and get owner
    const [rows] = await db
      .promise()
      .query("SELECT user_id FROM questions WHERE question_id = ?", [
        questionId,
      ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "Question not found",
      });
    }

    // 2. Authorization check
    if (rows[0].user_id !== userId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not allowed to delete this question",
      });
    }

    // 3. Delete question
    await db
      .promise()
      .query("DELETE FROM questions WHERE question_id = ?", [questionId]);

    // 4. Success response
    return res.status(200).json({
      message: "Question deleted successfully",
      question_id: questionId,
    });
  } catch (err) {
    console.error("Delete question error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};
