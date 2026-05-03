const isUser = (req, res, next) => {
  if (req.user?.role !== "user") {
    return res.status(403).json({ message: "Access denied. Regular users only." });
  }
  next();
};

export default isUser;
