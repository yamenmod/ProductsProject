const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
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

    req.user = decoded;
    return next();
  } catch (error) {
    console.log("[AUTH] Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
