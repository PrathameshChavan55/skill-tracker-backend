import { Router } from "express";

import verifyToken from "../middleware/auth.js";
import isAdmin from "../middleware/admin.js";
import isUser from "../middleware/user.js";

import { register, login, getMe } from "../controllers/authController.js";
import { getAllTopics } from "../controllers/topicController.js";
import {
  getMyLogs,
  addLog,
  updateLog,
  deleteLog,
  getMyStats,
} from "../controllers/logController.js";
import { getLeaderboard } from "../controllers/leaderboardController.js";
import {
  getAllUsers,
  getUserLogs,
  deleteUser,
  deleteAnyLog,
  makeAdmin,
  getPlatformStats,
  getAdminTopics,
  addTopic,
  deleteTopic,
} from "../controllers/adminController.js";

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", verifyToken, getMe);

// ─── Topics (public) ─────────────────────────────────────────────────────────
router.get("/topics", getAllTopics);

// ─── Learning Logs (role: user only) ─────────────────────────────────────────
router.get("/logs/stats", verifyToken, isUser, getMyStats);
router.get("/logs", verifyToken, isUser, getMyLogs);
router.post("/logs", verifyToken, isUser, addLog);
router.put("/logs/:id", verifyToken, isUser, updateLog);
router.delete("/logs/:id", verifyToken, isUser, deleteLog);

// ─── Leaderboard (any logged-in user) ────────────────────────────────────────
router.get("/leaderboard", verifyToken, getLeaderboard);

// ─── Admin ───────────────────────────────────────────────────────────────────
router.get("/admin/users", verifyToken, isAdmin, getAllUsers);
router.get("/admin/users/:id/logs", verifyToken, isAdmin, getUserLogs);
router.delete("/admin/users/:id", verifyToken, isAdmin, deleteUser);
router.delete("/admin/logs/:id", verifyToken, isAdmin, deleteAnyLog);
router.patch("/admin/users/:id/make-admin", verifyToken, isAdmin, makeAdmin);
router.get("/admin/stats", verifyToken, isAdmin, getPlatformStats);
router.get("/admin/topics", verifyToken, isAdmin, getAdminTopics);
router.post("/admin/topics", verifyToken, isAdmin, addTopic);
router.delete("/admin/topics/:id", verifyToken, isAdmin, deleteTopic);

export default router;
