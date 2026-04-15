const jwt = require("jsonwebtoken");
const db = require("../db/connection");

// Creates the JWT payload that the frontend stores after login or register.
// This keeps the user id, username, and role available for later checks.
const getToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "7d" },
  );

// Creates a normal user account and returns the session token for the app.
// The response includes the user role so the frontend can show admin-only UI.
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username.trim(), normalizedEmail],
    );

    if (existingUsers.length) {
      return res.status(400).json({ message: "User already exists" });
    }

    const [insertResult] = await db.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username.trim(), normalizedEmail, password, "user"],
    );

    const [users] = await db.query(
      "SELECT id, username, email, role FROM users WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );

    const user = users[0];

    const token = getToken(user);

    return res.status(201).json({
      message: "success",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Validates username and password, then returns the signed login session.
// If the credentials do not match, the request is rejected with a login error.
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const [users] = await db.query(
      "SELECT id, username, email, password, role FROM users WHERE username = ? AND password = ? LIMIT 1",
      [username.trim(), password],
    );

    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid login" });
    }

    const token = getToken(user);

    return res.status(200).json({
      message: "success",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
};
