import Topic from "../models/Topic.js";

// GET /api/topics — public
export const getAllTopics = async (req, res, next) => {
  try {
    const topics = await Topic.find().sort({ name: 1 }).select("name createdAt");
    res.json({ topics });
  } catch (error) {
    next(error);
  }
};
