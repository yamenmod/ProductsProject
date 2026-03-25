// ===== IMPORT REQUIRED MODULES =====
// express: Framework for building routes and handling requests
const express = require("express");

// Create a router object to define routes
// We use router instead of app because this is a separate route file
const router = express.Router();

// Import database connection to query the database
const db = require("../db/connection");

// ===== LOGIN ROUTE =====
// When frontend sends POST request to /auth/login
// This handles user login logic
router.post("/login", async (req, res) => {
  // Extract username and password from request body (data sent from frontend)
  const { username, password } = req.body;
  console.log("LOGIN REQ:", username);

  // SQL query to find user with matching username AND password
  // The ? symbols are placeholders to prevent SQL injection attacks
  const sql = "SELECT * FROM users WHERE username=? AND password=?";

  // Execute the SQL query
  db.query(sql, [username, password], (err, results) => {
    // If database query fails, send error response
    if (err) {
      console.error("LOGIN QUERY ERROR:", err);
      return res.status(500).json({ message: "DB error" });
    }

    // If no user found with those credentials, send error
    // results.length === 0 means no rows were returned
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid login" });
    }

    // User found! Create a user object with only needed data
    const user = {
      id: results[0].id, // User's ID from database
      username: results[0].username, // User's username
    };

    // Store user in session: req.session automatically uses cookies
    // This keeps user logged in across requests
    req.session.user = user;

    // Send success response with user data to frontend
    return res.json({ message: "success", user });
  });
});

// ===== REGISTER ROUTE =====
router.post("/register", async (req, res) => {
  // Extract username, email and password from request body
  const { username, email, password } = req.body;

  // SQL query to INSERT a new user into the users table
  const sql = "INSERT INTO users (username, email, password) VALUES (?,?,?)";

  // Execute the INSERT query
  db.query(sql, [username, email, password], (err) => {
    if (err) {
      console.error("REGISTER ERROR:", err);
      return res.status(400).json({ message: "Username exists" });
    }

    res.json({ message: "registered" });
  });
});

// ===== SESSION CHECK ROUTE =====
// When frontend sends GET request to /auth/session
// This checks if user is still logged in (used on page refresh)
router.get("/session", async (req, res) => {
  // Check if session has a user stored (meaning user is logged in)
  if (req.session.user) {
    // User is logged in, send back user data
    return res.json({ loggedIn: true, user: req.session.user });
  }

  // No user in session, so not logged in
  res.json({ loggedIn: false });
});

// ===== LOGOUT ROUTE =====
// When frontend sends POST request to /auth/logout
// This destroys the user's session (logs them out)
router.post("/logout", async (req, res) => {
  // Destroy the session, which deletes all stored session data
  // This effectively logs out the user
  req.session.destroy();

  // Send confirmation response
  res.json({ message: "logged out" });
});

// ===== EXPORT ROUTER =====
// Make these routes available to server.js
module.exports = router;
