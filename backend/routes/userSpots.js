// ===== IMPORT REQUIRED MODULES =====
// express: Framework for building routes
const express = require("express");

// Create a router object for this route file
const router = express.Router();

// Import database connection to query the database
const db = require("../db/connection");

// ===== USER SELECTS A SPOT ROUTE =====
// When frontend sends POST request to /userSpots/select
// This saves a spot to user's favorites (creates record in user_spots junction table)
router.post("/select", async (req, res) => {
  // Extract user_id and spot_id from request body
  const { user_id, spot_id } = req.body;

  // Debug: Print values to console (helps verify data coming from frontend)
  console.log(user_id, spot_id);

  // SQL query to INSERT into user_spots junction table
  // This creates a relationship between user and spot
  // user_id: whose favorite list we're adding to
  // spot_id: which spot to add to favorites
  const sql = "INSERT INTO user_spots (user_id, spot_id) VALUES (?, ?)";

  // Execute the INSERT query
  db.query(sql, [user_id, spot_id], async (err) => {
    // If database error occurs, send error response
    if (err) return res.status(500).send(err);

    // Send success response
    res.json({ message: "Spot selected!" });
  });
});

// ===== GET USER'S FAVORITE SPOTS ROUTE =====
// When frontend sends GET request to /userSpots/selected
// This retrieves all spots that the user has added to favorites
router.get("/selected", async (req, res) => {
  // Extract user_id from request body
  const { user_id } = req.body;

  // SQL query using JOIN to get complete spot information for user's favorites
  // JOIN: combines data from multiple tables
  // SELECT SurfSpots.*: get all columns from SurfSpots table
  // JOIN user_spots: match spots that are in user_spots table
  // WHERE user_spots.user_id = ?: only get spots favorited by this user
  const sql = `
    SELECT SurfSpots.*
    FROM SurfSpots
    JOIN user_spots ON user_spots.spot_id = SurfSpots.id
    WHERE user_spots.user_id = ?
  `;

  // Execute the SELECT query
  db.query(sql, [user_id], async (err, results) => {
    // If database error occurs, send error response
    if (err) return res.status(500).send(err);

    // Send back all favorited spots as JSON
    res.json(results);
  });
});

// ===== USER UNSELECTS A SPOT ROUTE =====
// When frontend sends DELETE request to /userSpots/unselect/:user_id/:spot_id
// This removes a spot from user's favorites (deletes record from user_spots junction table)
router.delete("/unselect/:user_id/:spot_id",async (req, res) => {
  // Extract user_id and spot_id from URL parameters
  const { user_id, spot_id } = req.params;

  // SQL query to DELETE from user_spots junction table
  // This removes the relationship between user and spot
  // WHERE user_id=? AND spot_id=?: removes this specific favorite
  const sql = "DELETE FROM user_spots WHERE user_id=? AND spot_id=?";

  // Execute the DELETE query
  db.query(sql, [user_id, spot_id], async (err) => {
    // If database error occurs, send error response
    if (err) return res.status(500).send(err);

    // Send success response
    res.json({ message: "Spot unselected!" });
  });
});

// ===== EXPORT ROUTER =====
// Make these routes available to server.js
module.exports = router;
