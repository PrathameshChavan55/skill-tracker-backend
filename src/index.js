import express from "express";
import { connectDB } from "./config/db.js";
import { config } from "dotenv";

connectDB();
config();

const app = express();
app.use(express.json());



app.get("/", (req, res) => {
  res.send("API Running");
});

app.listen(process.env.PORT, () => console.log("Server running"));