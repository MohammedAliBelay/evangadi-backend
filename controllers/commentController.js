import { StatusCodes } from "http-status-codes";
import { createComment, getCommentsByAnswer } from "../models/commentModel.js";

export const postComment = async (req, res) => {
  try {
    // 1. Get data from request body
    const { answerid, comment_body } = req.body;
    const userid = req.user?.id;

    // User ID ONLY from JWT
    if (!userid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // 3. Validation
    if (!answerid || !comment_body) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Bad Request",
        message: "Please provide answer ID and comment text",
      });
    }

    // 4. Insert comment into database
    await createComment(answerid, userid, comment_body);

    // 5. Success response
    return res.status(StatusCodes.CREATED).json({
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Post Comment Error:", error);

    // 6. Server error
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

/**
 * GET /api/comments/:answerid
 * Description: Get all comments for an answer
 */
export const getComments = async (req, res) => {
  try {
    const { answerid } = req.params;

    // 1. Get comments from database
    const comments = await getCommentsByAnswer(answerid);

    // 2. Success response
    return res.status(StatusCodes.OK).json({
      message: "Comments retrieved successfully",
      comments,
    });
  } catch (error) {
    console.error("Get Comments Error:", error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      message: "An unexpected error occurred.",
    });
  }
};

export const deleteComment = async (req, res) => {
  const user_id = req.user.user_id;
  const comment_id = req.params.comment_id;

  try {
    const [comment] = await db
      .promise()
      .query("SELECT user_id FROM comments WHERE comment_id = ?", [comment_id]);

    if (comment.length === 0)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "Not Found", msg: "Comment not found" });
    if (comment[0].user_id !== user_id)
      return res.status(StatusCodes.FORBIDDEN).json({
        error: "Forbidden",
        msg: "You are not authorized to delete this comment",
      });

    await db
      .promise()
      .query("DELETE FROM comments WHERE comment_id = ?", [comment_id]);
    res.status(StatusCodes.OK).json({ msg: "Comment deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Internal Server Error",
      msg: "An unexpected error occurred",
    });
  }
};
