const jwt = require("jsonwebtoken");
const db = require("../db/connection");

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      console.log("[AUTH] No Bearer token found in headers");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = header.split(" ")[1];
    console.log("[AUTH] Token received:", token.substring(0, 20) + "...");
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    console.log("[AUTH] Token verified for user:", decoded.id);

        const [users] = await db.query(
          "SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1",
          [decoded.id],
        );

        const user = users[0];

        if (!user) {
          console.log("[AUTH] User not found for token:", decoded.id);
          return res.status(401).json({ message: "Invalid token" });
        }

        if (user.role !== "admin" && Number(user.is_active) !== 1) {
          return res.status(403).json({
            message:
              "Sorry, your account has been unactivated. You can no longer use our website. Please contact the administrator at Waseemyamen1@gmail.com for assistance.",
          });
        }

        req.user = {
          ...decoded,
          role: user.role,
          isActive: Number(user.is_active) === 1,
        };
    return next();
  } catch (error) {
    console.log("[AUTH] Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
