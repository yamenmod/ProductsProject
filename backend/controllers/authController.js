const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db/connection");
const { createMailTransporter } = require("../utils/mailer");

// Authentication and profile endpoints.

const normalizeOptionalMeasurement = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    const error = new Error(`${fieldName} must be a valid number`);
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
};

const formatUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role ?? null,
  isActive:
    user.is_active === null || user.is_active === undefined
      ? null
      : Number(user.is_active) === 1,

  weight:
    user.weight === null || user.weight === undefined
      ? null
      : Number(user.weight),
  height:
    user.height === null || user.height === undefined
      ? null
      : Number(user.height),
});

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
// Creates a new user account and returns a token for the frontend session.
const register = async (req, res) => {
  try {
    const { username, email, password, weight, height } = req.body;

    console.log("📝 REGISTER REQUEST:", {
      username,
      email,
      weight,
      height,
    });

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedWeight = normalizeOptionalMeasurement(weight, "Weight");
    const normalizedHeight = normalizeOptionalMeasurement(height, "Height");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("✅ NORMALIZED DATA:", {
      normalizedUsername,
      normalizedEmail,
      normalizedWeight,
      normalizedHeight,
    });

    const [existingUsername] = await db.query(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      [normalizedUsername],
    );

    if (existingUsername.length) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const [existingEmail] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );

    if (existingEmail.length) {
      return res.status(400).json({
        message:
          "This email address is already registered. Please use a different email or login to your existing account.",
      });
    }

    const [insertResult] = await db.query(
      "INSERT INTO users (username, email, password, role, weight, height, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [
        normalizedUsername,
        normalizedEmail,
        hashedPassword,
        "user",
        normalizedWeight,
        normalizedHeight,
      ],
    );

    console.log("✅ INSERT RESULT:", { insertId: insertResult.insertId });

    const [users] = await db.query(
      "SELECT id, username, email, role, is_active, weight, height FROM users WHERE id = ? LIMIT 1",
      [insertResult.insertId],
    );

    const user = users[0];

    console.log("✅ RETRIEVED USER FROM DB:", user);

    const token = getToken(user);

    const formattedUser = formatUser(user);
    console.log("✅ FORMATTED USER:", formattedUser);

    return res.status(201).json({
      message: "success",
      token,
      user: formattedUser,
    });
  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

// Validates username and password, then returns the signed login session.
// If the credentials do not match, the request is rejected with a login error.
// Validates credentials and returns the authenticated session payload.
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("🔐 LOGIN REQUEST:", { username });

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const [users] = await db.query(
      "SELECT id, username, email, password, role, is_active, weight, height FROM users WHERE username = ? LIMIT 1",
      [username.trim()],
    );

    const user = users[0];

    const isPasswordValid = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !isPasswordValid) {
      console.log("❌ LOGIN FAILED: Invalid credentials");
      return res.status(401).json({ message: "Invalid login" });
    }

    if (user.role !== "admin" && Number(user.is_active) !== 1) {
      return res.status(403).json({
        message:
          "Sorry, your account has been unactivated. You can no longer use our website. Please contact the administrator at Waseemyamen1@gmail.com for assistance.",
      });
    }

    console.log("✅ LOGIN SUCCESS: User found:", {
      id: user.id,
      username: user.username,
      role: user.role,
      weight: user.weight,
      height: user.height,
    });

    const token = getToken(user);
    const formattedUser = formatUser(user);

    console.log("LOGIN RESPONSE USER:", formattedUser);

    return res.status(200).json({
      message: "success",
      token,
      user: formattedUser,
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Returns the current user's profile information.
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("📋 GET PROFILE REQUEST: userId =", userId);

    const [users] = await db.query(
      "SELECT id, username, email, role, is_active, weight, height FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    const user = users[0];

    if (!user) {
      console.log("❌ PROFILE NOT FOUND for userId:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ PROFILE FOUND:", user);

    const formattedUser = formatUser(user);
    console.log("✅ FORMATTED PROFILE:", formattedUser);

    return res.status(200).json({ user: formattedUser });
  } catch (error) {
    console.error("❌ GET PROFILE ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Updates editable profile fields for the current user.
const updateProfile = async (req, res) => {
  try {
    const { username, weight, height } = req.body;
    const userId = req.user.id;

    console.log("🔧 UPDATE PROFILE REQUEST:", {
      userId,
      username,
      weight,
      height,
    });

    if (!username || !username.trim()) {
      return res.status(400).json({ message: "Username is required" });
    }

    const normalizedUsername = username.trim();
    const normalizedWeight = normalizeOptionalMeasurement(weight, "Weight");
    const normalizedHeight = normalizeOptionalMeasurement(height, "Height");

    console.log("✅ NORMALIZED UPDATE DATA:", {
      normalizedUsername,
      normalizedWeight,
      normalizedHeight,
    });

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    if (!existingUsers.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [updateResult] = await db.query(
      "UPDATE users SET username = ?, weight = ?, height = ? WHERE id = ?",
      [normalizedUsername, normalizedWeight, normalizedHeight, userId],
    );

    console.log("✅ UPDATE RESULT:", {
      affectedRows: updateResult.affectedRows,
    });

    const [users] = await db.query(
      "SELECT id, username, email, role, is_active, weight, height FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    const user = users[0];
    console.log("✅ RETRIEVED UPDATED USER:", user);

    return res.status(200).json({
      message: "Profile updated",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("❌ UPDATE PROFILE ERROR:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Username already exists" });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
