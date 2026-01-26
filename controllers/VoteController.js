import db from "../config/database.js";

export const voteAnswer = async (req, res) => {
  const user_id = req.user.id;
  const answer_id = req.params.answer_id;
  const { voteType } = req.body; // "upvote" | "downvote"

  if (!["upvote", "downvote"].includes(voteType)) {
    return res.status(400).json({ msg: "Invalid vote type" });
  }

  try {
    // Prevent missing answer_id
    if (!answer_id) {
      return res.status(400).json({ msg: "Answer ID is required" });
    }

    // Check if user already voted on this answer
    const [existingVote] = await db
      .promise()
      .query(
        "SELECT vote_type FROM answer_votes WHERE user_id = ? AND answer_id = ?",
        [user_id, answer_id]
      );

    let addCol, remCol;

    if (existingVote.length > 0) {
      const currentVote = existingVote[0].vote_type;

      if (currentVote === voteType) {
        // User clicked the same vote again → remove vote
        await db
          .promise()
          .query(
            "DELETE FROM answer_votes WHERE user_id = ? AND answer_id = ?",
            [user_id, answer_id]
          );

        addCol = voteType === "upvote" ? "likes" : "dislikes";

        // Prevent negative counts
        await db
          .promise()
          .query(
            `UPDATE answers SET ${addCol} = GREATEST(${addCol} - 1, 0) WHERE answer_id = ?`,
            [answer_id]
          );

        return res.json({ msg: "Vote removed" });
      }

      // User switched vote type
      addCol = voteType === "upvote" ? "likes" : "dislikes";
      remCol = voteType === "upvote" ? "dislikes" : "likes";

      await db
        .promise()
        .query(
          "UPDATE answer_votes SET vote_type = ? WHERE user_id = ? AND answer_id = ?",
          [voteType, user_id, answer_id]
        );

      // Prevent negative counts on the column being decremented
      await db
        .promise()
        .query(
          `UPDATE answers SET ${addCol} = ${addCol} + 1, ${remCol} = GREATEST(${remCol} - 1, 0) WHERE answer_id = ?`,
          [answer_id]
        );

      return res.json({ msg: "Vote switched" });
    }

    // New vote
    await db
      .promise()
      .query(
        "INSERT INTO answer_votes (user_id, answer_id, vote_type) VALUES (?, ?, ?)",
        [user_id, answer_id, voteType]
      );

    addCol = voteType === "upvote" ? "likes" : "dislikes";
    await db
      .promise()
      .query(
        `UPDATE answers SET ${addCol} = ${addCol} + 1 WHERE answer_id = ?`,
        [answer_id]
      );

    return res.json({ msg: "Vote added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Voting failed" });
  }
};
