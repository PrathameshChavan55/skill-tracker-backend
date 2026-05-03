import User from "../models/User.js";
import LearningLog from "../models/LearningLog.js";

// GET /api/leaderboard
export const getLeaderboard = async (req, res, next) => {
  try {
    // Only role: "user" appears on leaderboard
    const users = await User.find({ role: "user" })
      .sort({ totalPoints: -1 })
      .select("name totalPoints currentStreak longestStreak");

    // Get total log count per user
    const userIds = users.map((u) => u._id);

    const logCounts = await LearningLog.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", totalLogs: { $sum: 1 } } },
    ]);

    const logCountMap = {};
    logCounts.forEach((lc) => {
      logCountMap[lc._id.toString()] = lc.totalLogs;
    });

    // Get top topic per user
    const topTopics = await LearningLog.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: { userId: "$userId", topic: "$topic" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      {
        $group: {
          _id: "$_id.userId",
          topTopic: { $first: "$_id.topic" },
        },
      },
    ]);

    const topTopicMap = {};
    topTopics.forEach((tt) => {
      topTopicMap[tt._id.toString()] = tt.topTopic;
    });

    const ranked = users.map((u, index) => ({
      rank: index + 1,
      id: u._id,
      name: u.name,
      totalPoints: u.totalPoints,
      totalLogs: logCountMap[u._id.toString()] || 0,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
      topTopic: topTopicMap[u._id.toString()] || null,
    }));

    // Find current user's rank (null if admin)
    let myRank = null;
    if (req.user.role === "user") {
      const idx = ranked.findIndex((r) => r.id.toString() === req.user._id.toString());
      myRank = idx !== -1 ? ranked[idx].rank : null;
    }

    res.json({ leaderboard: ranked, myRank });
  } catch (error) {
    next(error);
  }
};
