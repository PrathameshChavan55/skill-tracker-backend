import User from "../models/User.js";

const getPoints = (level) =>
  ({ Beginner: 10, Intermediate: 20, Advanced: 30 }[level] ?? 0);

// GET /api/skills
export const getSkills = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("skills totalPoints");
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/skills
export const addSkill = async (req, res) => {
  try {
    const { name, level } = req.body;
    if (!name || !level)
      return res.status(400).json({ message: "Name and level required" });

    const points = getPoints(level);
    const user = await User.findById(req.user._id);
    user.skills.push({ name, level, points });
    user.totalPoints += points;
    await user.save();

    res.status(201).json({ message: "Skill added", skills: user.skills, totalPoints: user.totalPoints });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/skills/:skillId
export const updateSkill = async (req, res) => {
  try {
    const { name, level } = req.body;
    const user = await User.findById(req.user._id);
    const skill = user.skills.id(req.params.skillId);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    user.totalPoints -= skill.points;
    if (name) skill.name = name;
    if (level) { skill.level = level; skill.points = getPoints(level); }
    user.totalPoints += skill.points;

    await user.save();
    res.json({ message: "Skill updated", skills: user.skills, totalPoints: user.totalPoints });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/skills/:skillId
export const deleteSkill = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const skill = user.skills.id(req.params.skillId);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    user.totalPoints -= skill.points;
    skill.deleteOne();
    await user.save();

    res.json({ message: "Skill deleted", skills: user.skills, totalPoints: user.totalPoints });
  } catch (err) { res.status(500).json({ message: err.message }); }
};