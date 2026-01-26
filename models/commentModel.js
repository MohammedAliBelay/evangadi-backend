import database from "../config/database.js";

export const createComment = async (answerId, userId, commentBody) => {
  try {
    const query = `
      INSERT INTO comments (answer_id, user_id, comment_body)
      VALUES (?, ?, ?)
    `;

    const values = [answerId, userId, commentBody];

    const [result] = await database.promise().query(query, values);
    return result;
  } catch (error) {
    console.log("Error creating comment:", error.message);
    throw error; // Just pass the error up
  }
};

export const getCommentsByAnswer = async (answerId) => {
  try {
    const query = `
      SELECT c.*, u.username, u.first_name, u.last_name 
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.answer_id = ?
      ORDER BY c.created_at ASC
    `;

    const [results] = await database.promise().query(query, [answerId]);
    return results;
  } catch (error) {
    console.log("Error getting comments:", error.message);
    throw error;
  }
};


