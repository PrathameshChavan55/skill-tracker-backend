import User from "../models/User.js";
import LearningLog from "../models/LearningLog.js";
import Topic from "../models/Topic.js";

// GET /api/admin/users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const userIds = users.map((u) => u._id);
    const logCounts = await LearningLog.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", totalLogs: { $sum: 1 } } },
    ]);

    const logMap = {};
    logCounts.forEach((lc) => (logMap[lc._id.toString()] = lc.totalLogs));

    const result = users.map((u) => ({
      ...u.toObject(),
      totalLogs: logMap[u._id.toString()] || 0,
    }));

    res.json({ count: result.length, users: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users/:id/logs
export const getUserLogs = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    const logs = await LearningLog.find({ userId: req.params.id }).sort({ loggedOn: -1 });
    res.json({ user, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Delete all their logs too
    await LearningLog.deleteMany({ userId: req.params.id });
    await user.deleteOne();

    res.json({ message: `User '${user.name}' and all their logs have been deleted.` });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/logs/:id
export const deleteAnyLog = async (req, res, next) => {
  try {
    const log = await LearningLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: "Log not found." });

    // Deduct points from user
    await User.findByIdAndUpdate(log.userId, {
      $inc: { totalPoints: -log.pointsEarned },
    });

    await log.deleteOne();
    res.json({ message: "Log deleted successfully.", pointsDeducted: log.pointsEarned });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/make-admin
export const makeAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.role === "admin") {
      return res.status(400).json({ message: "User is already an admin." });
    }

    user.role = "admin";
    await user.save();

    res.json({ message: `${user.name} has been promoted to admin.`, user });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/stats
export const getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalLogs = await LearningLog.countDocuments();

    // Most active user (most logs)
    const activeAgg = await LearningLog.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    let mostActiveUser = null;
    if (activeAgg.length) {
      const u = await User.findById(activeAgg[0]._id).select("name email");
      mostActiveUser = { ...u.toObject(), totalLogs: activeAgg[0].count };
    }

    // Top scoring user
    const topScorer = await User.findOne({ role: "user" })
      .sort({ totalPoints: -1 })
      .select("name email totalPoints");

    // Most popular topic
    const topTopicAgg = await LearningLog.aggregate([
      { $group: { _id: "$topic", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    const mostPopularTopic = topTopicAgg[0]
      ? { topic: topTopicAgg[0]._id, count: topTopicAgg[0].count }
      : null;

    // Average confidence across platform
    const avgAgg = await LearningLog.aggregate([
      { $group: { _id: null, avg: { $avg: "$confidenceScore" } } },
    ]);
    const averageConfidenceAcrossPlatform = avgAgg[0]?.avg
      ? parseFloat(avgAgg[0].avg.toFixed(2))
      : 0;

    res.json({
      totalUsers,
      totalLogs,
      mostActiveUser,
      topScoringUser: topScorer,
      mostPopularTopic,
      averageConfidenceAcrossPlatform,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/topics
export const getAdminTopics = async (req, res, next) => {
  try {
    const topics = await Topic.find().sort({ name: 1 }).populate("addedBy", "name email");
    res.json({ count: topics.length, topics });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/topics
export const addTopic = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return res.status(400).json({ message: "Topic name is required." });
    }

    const normalized = name.toLowerCase().trim();
    const exists = await Topic.findOne({ name: normalized });
    if (exists) {
      return res.status(409).json({ message: `Topic '${normalized}' already exists.` });
    }

    const topic = await Topic.create({ name: normalized, addedBy: req.user._id });
    res.status(201).json({ message: "Topic added successfully.", topic });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/topics/:id
export const deleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: "Topic not found." });

    await topic.deleteOne();
    res.json({ message: `Topic '${topic.name}' removed successfully.` });
  } catch (error) {
    next(error);
  }
};
