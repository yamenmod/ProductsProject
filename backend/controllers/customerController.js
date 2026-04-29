const db = require("../db/connection");

// Returns the admin customer list from the users table.
// The frontend uses this to render the admin-only customers page.
const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          id,
          username,
          email,
          role,
          created_at AS createdAt
        FROM users
        WHERE role = 'user'
        ORDER BY created_at DESC, id DESC
      `,
    );

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCustomers,
};