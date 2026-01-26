import app from "./app.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = 4000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
