import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const database = mysql.createPool({
  host: "91.204.209.29",
  user: "mohammvo_Evangadi",
  password: "CBPsEO_-YAkh5&od",
  database: "mohammvo_Forum",
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
// export it
export default database;
