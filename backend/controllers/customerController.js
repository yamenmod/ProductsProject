const db = require("../db/connection");

// Returns the admin customer list from the users table.
// The frontend uses this to render the admin-only customers page.
const getCustomers = async (req, res) => {
  try {
    // Alias created_at as createdAt so the frontend can format it consistently.
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

// Deletes a non-admin customer account from the users table.
// Admin accounts are protected so the current operator cannot remove themselves.
// Orders related to the customer are preserved by setting user_id to NULL.
const deleteCustomer = async (req, res) => {
  try {
    // Reject missing or self-targeted deletes before touching the database.
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (Number(userId) === Number(req.user.id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const [users] = await db.query(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    if (users[0].role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be deleted" });
    }

    // Set user_id to NULL in all orders for this user to preserve order history
    await db.query(
      "UPDATE orders SET user_id = NULL WHERE user_id = ?",
      [userId],
    );

    // Now delete the user
    await db.query("DELETE FROM users WHERE id = ?", [userId]);

    return res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCustomers,
  deleteCustomer,
};