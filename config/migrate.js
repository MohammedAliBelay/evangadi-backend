import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function migrate() {
  try {
    // 1. Create tables and types
    await pool.query(`
      -- Create ENUM type for vote_type
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_type_enum') THEN
          CREATE TYPE vote_type_enum AS ENUM ('upvote', 'downvote');
        END IF;
      END $$;

      -- Users Table
      DROP TABLE IF EXISTS answer_votes CASCADE;
      DROP TABLE IF EXISTS comments CASCADE;
      DROP TABLE IF EXISTS answers CASCADE;
      DROP TABLE IF EXISTS questions CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        reset_otp VARCHAR(6),
        reset_otp_expiry BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE questions (
        question_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE OR REPLACE FUNCTION update_questions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_questions_updated_at
      BEFORE UPDATE ON questions
      FOR EACH ROW
      EXECUTE PROCEDURE update_questions_updated_at();

      CREATE TABLE answers (
        answer_id SERIAL PRIMARY KEY,
        answer TEXT NOT NULL,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        question_id INT NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes INT DEFAULT 0,
        dislikes INT DEFAULT 0
      );

      CREATE OR REPLACE FUNCTION update_answers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_answers_updated_at
      BEFORE UPDATE ON answers
      FOR EACH ROW
      EXECUTE PROCEDURE update_answers_updated_at();

      CREATE TABLE comments (
        comment_id SERIAL PRIMARY KEY,
        comment_body TEXT NOT NULL,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        answer_id INT NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE answer_votes (
        vote_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        answer_id INT NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
        vote_type vote_type_enum NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_answer_vote UNIQUE (user_id, answer_id)
      );
    `);

    console.log("✅ Database migration completed successfully!");
    await pool.end();
  } catch (err) {
    console.error("❌ Migration failed:", err);
    await pool.end();
    process.exit(1);
  }
}

migrate();
