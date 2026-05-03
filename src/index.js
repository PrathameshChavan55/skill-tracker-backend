import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import router from "./routes/index.js";
import Topic from "./models/Topic.js";

const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    message: `Route '${req.method} ${req.originalUrl}' not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res
      .status(409)
      .json({ message: `A record with this ${field} already exists.` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format." });
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error.",
  });
});

// ─── Default Topics Seed ─────────────────────────────────────────────────────
const DEFAULT_TOPICS = [
  "javascript",
  "python",
  "java",
  "c++",
  "react",
  "node.js",
  "mongodb",
  "sql",
  "dsa",
  "machine learning",
  "html/css",
  "git",
  "docker",
  "system design",
  "typescript",
];

const seedTopics = async () => {
  const count = await Topic.countDocuments();
  if (count === 0) {
    await Topic.insertMany(DEFAULT_TOPICS.map((name) => ({ name })));
    console.log(`🌱 Seeded ${DEFAULT_TOPICS.length} default topics.`);
  }
};

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedTopics();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Env: ${process.env.NODE_ENV || "development"}`);
  });
});
