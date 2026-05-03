import LearningLog from "../models/LearningLog.js";
import User from "../models/User.js";
import Topic from "../models/Topic.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toDateOnly = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const calcPoints = (score) => score * 10;

const validateLogInput = async (body) => {
  const errors = [];
  const { title, description, topic, confidenceScore } = body;

  if (!title || typeof title !== "string") {
    errors.push("title is required.");
  } else if (title.trim().length < 3) {
    errors.push("title must be at least 3 characters.");
  } else if (title.trim().length > 100) {
    errors.push("title must not exceed 100 characters.");
  }

  if (!description || typeof description !== "string") {
    errors.push("description is required.");
  } else if (description.trim().length < 10) {
    errors.push("description must be at least 10 characters.");
  } else if (description.trim().length > 1000) {
    errors.push("description must not exceed 1000 characters.");
  }

  if (!topic) {
    errors.push("topic is required.");
  } else {
    const found = await Topic.findOne({ name: topic.toLowerCase().trim() });
    if (!found) {
      errors.push(
        `topic '${topic}' is not in the allowed list. Use GET /api/topics to see valid options.`
      );
    }
  }

  if (confidenceScore === undefined || confidenceScore === null || confidenceScore === "") {
    errors.push("confidenceScore is required.");
  } else {
    const score = Number(confidenceScore);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      errors.push("confidenceScore must be a number between 1 and 5 (integer).");
    }
  }

  return errors;
};

const updateStreak = async (user) => {
  const today = toDateOnly(new Date());
  const lastLog = user.lastLogDate ? toDateOnly(user.lastLogDate) : null;

  if (!lastLog) {
    user.currentStreak = 1;
  } else {
    const diffDays = Math.round((today - lastLog) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      user.currentStreak += 1;
    } else if (diffDays > 1) {
      user.currentStreak = 1;
    }
    // diffDays === 0 → already logged today, streak unchanged
  }

  if (user.currentStreak > user.longestStreak) {
    user.longestStreak = user.currentStreak;
  }

  user.lastLogDate = today;
  await user.save();
};

// ─── Controllers ─────────────────────────────────────────────────────────────

// GET /api/logs
export const getMyLogs = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.topic) {
      filter.topic = req.query.topic.toLowerCase().trim();
    }

    const logs = await LearningLog.find(filter).sort({ loggedOn: -1 });
    res.json({ count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};

// POST /api/logs
export const addLog = async (req, res, next) => {
  try {
    const errors = await validateLogInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    const { title, description, topic, confidenceScore, loggedOn } = req.body;
    const score = Number(confidenceScore);
    const points = calcPoints(score);

    const log = await LearningLog.create({
      userId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      topic: topic.toLowerCase().trim(),
      confidenceScore: score,
      pointsEarned: points,
      loggedOn: loggedOn || new Date(),
    });

    // Update points
    const user = await User.findById(req.user._id);
    user.totalPoints += points;
    await updateStreak(user); // also saves user

    res.status(201).json({
      message: "Learning log added successfully.",
      log,
      pointsEarned: points,
      newTotalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/logs/:id
export const updateLog = async (req, res, next) => {
  try {
    const log = await LearningLog.findOne({ _id: req.params.id, userId: req.user._id });
    if (!log) {
      return res.status(404).json({ message: "Log not found or you do not own this log." });
    }

    const errors = await validateLogInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    const { title, description, topic, confidenceScore } = req.body;
    const newScore = Number(confidenceScore);
    const newPoints = calcPoints(newScore);
    const oldPoints = log.pointsEarned;

    log.title = title.trim();
    log.description = description.trim();
    log.topic = topic.toLowerCase().trim();
    log.confidenceScore = newScore;
    log.pointsEarned = newPoints;
    await log.save();

    // Adjust user's total points
    const pointDiff = newPoints - oldPoints;
    if (pointDiff !== 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { totalPoints: pointDiff },
      });
    }

    res.json({
      message: "Log updated successfully.",
      log,
      pointsDiff: pointDiff,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/logs/:id
export const deleteLog = async (req, res, next) => {
  try {
    const log = await LearningLog.findOne({ _id: req.params.id, userId: req.user._id });
    if (!log) {
      return res.status(404).json({ message: "Log not found or you do not own this log." });
    }

    await log.deleteOne();

    // Subtract points
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalPoints: -log.pointsEarned },
    });

    res.json({ message: "Log deleted successfully.", pointsDeducted: log.pointsEarned });
  } catch (error) {
    next(error);
  }
};

// GET /api/logs/stats
export const getMyStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select(
      "totalPoints currentStreak longestStreak"
    );

    const totalEntries = await LearningLog.countDocuments({ userId });

    // Top topics
    const topTopicsAgg = await LearningLog.aggregate([
      { $match: { userId } },
      { $group: { _id: "$topic", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { topic: "$_id", count: 1, _id: 0 } },
    ]);

    // Average confidence
    const avgAgg = await LearningLog.aggregate([
      { $match: { userId } },
      { $group: { _id: null, avgConfidence: { $avg: "$confidenceScore" } } },
    ]);
    const averageConfidence = avgAgg[0]?.avgConfidence
      ? parseFloat(avgAgg[0].avgConfidence.toFixed(2))
      : 0;

    const recentLogs = await LearningLog.find({ userId })
      .sort({ loggedOn: -1 })
      .limit(5)
      .select("title topic confidenceScore pointsEarned loggedOn");

    res.json({
      totalEntries,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      topTopics: topTopicsAgg,
      averageConfidence,
      recentLogs,
    });
  } catch (error) {
    next(error);
  }
};
