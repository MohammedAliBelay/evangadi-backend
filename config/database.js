import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const database = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.MYSQL_DB,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the database connection
database.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL connection error FULL:", err);
    return;
  } else {
    console.log("MySQL connected to evangadi_forum database");
    connection.release();
  }
});

export default database;
