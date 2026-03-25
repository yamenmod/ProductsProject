// ===== IMPORT REQUIRED MODULES =====
// express: Framework for building routes
const express = require("express");

// Create a router object for this route file
const router = express.Router();

// Import database connection to query the database
const db = require("../db/connection");

// ===== GET USER'S SURF SPOTS ROUTE =====
// When frontend sends GET request to /spots/:user_id
// This retrieves all surf spots created by a specific user
router.get("/:user_id", async (req, res) => {
  // Extract user_id from URL parameters (/spots/123 -> user_id = 123)
  const { user_id } = req.params;

  // SQL query to SELECT all surf spots for this user
  // ORDER BY difficulty ASC: sorts spots from easiest to hardest
  // The ? is a placeholder to prevent SQL injection
  db.query(
    "SELECT * FROM surfspots WHERE user_id=? ORDER BY difficulty ASC",
    [user_id], // Replace ? with actual user_id value
    (err, results) => {
      // If database error occurs, send error response
      if (err) return res.status(500).send(err);

      // Send back all surf spots as JSON
      res.json(results);
    },
  );
});

// ===== ADD NEW SURF SPOT ROUTE =====
// When frontend sends POST request to /spots
// This creates a new surf spot and saves it to database
router.post("/",async (req, res) => {
  // Extract spot data from request body (sent from frontend form)
  const { spot_name, difficulty, type, location, user_id, wave_height } = req.body;

  // SQL query to INSERT a new row into surfspots table
  // The ? symbols are placeholders for values
  const sql = `
    INSERT INTO surfspots (spot_name, difficulty, type, location, user_id, wave_height)
    VALUES (?,?,?,?,?,?)
  `;

  // Execute the INSERT query
  db.query(
    sql,
    [spot_name, difficulty, type, location, user_id, wave_height], // Values to insert
    (err, result) => {
      // If database error occurs, send error response
      if (err) return res.status(500).send(err);

      // Send success response with new spot's ID
      // result.insertId: ID automatically generated for new row
      res.json({ message: "Spot added!", id: result.insertId });
    },
  );
});

// ===== UPDATE SURF SPOT ROUTE =====
// When frontend sends PUT request to /spots/:id/:user_id
// This updates an existing surf spot
// Security: Only the spot owner (user_id match) can update their own spot
router.put("/:id/:user_id", async (req, res) => {
  // Extract spot ID and user ID from URL parameters
  const { id, user_id } = req.params;

  // Extract updated spot data from request body
  const { spot_name, difficulty, type, location } = req.body;

  // SQL query to UPDATE the spot
  // WHERE id=? AND user_id=? ensures only owner can update
  const sql = `
    UPDATE surfspots
    SET spot_name=?, difficulty=?, type=?, location=?
    WHERE id=? AND user_id=?
  `;

  // Execute the UPDATE query
  db.query(sql, [spot_name, difficulty, type, location, id, user_id], (err) => {
    // If database error occurs, send error response
    if (err) return res.status(500).send(err);

    // Send success response
    res.json({ message: "Spot updated!" });
  });
});

// ===== DELETE SURF SPOT ROUTE =====
// When frontend sends DELETE request to /spots/:id/:user_id
// This deletes a surf spot
// Security: Only the spot owner (user_id match) can delete their own spot
router.delete("/:id/:user_id", async (req, res) => {
  // Extract spot ID and user ID from URL parameters
  const { id, user_id } = req.params;

  // SQL query to DELETE the spot
  // WHERE id=? AND user_id=? ensures only owner can delete
  const sql = "DELETE FROM surfspots WHERE id=? AND user_id=?";

  // Execute the DELETE query
  db.query(sql, [id, user_id], (err) => {
    // If database error occurs, send error response
    if (err) return res.status(500).send(err);

    // Send success response
    res.json({ message: "Spot deleted!" });
  });
});

// ===== EXPORT ROUTER =====
// Make these routes available to server.js
module.exports = router;
