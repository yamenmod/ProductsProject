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
          is_active,
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

// Updates a customer activation flag without removing the account.
// Admin accounts remain protected so their login access is never affected.
const updateCustomerStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const rawIsActive = req.body.is_active ?? req.body.isActive;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const normalizedUserId = Number(userId);

    const [users] = await db.query(
      "SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1",
      [normalizedUserId],
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    if (users[0].role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be changed" });
    }

    const nextIsActive =
      rawIsActive === true || rawIsActive === 1 || rawIsActive === "1"
        ? 1
        : rawIsActive === false || rawIsActive === 0 || rawIsActive === "0"
          ? 0
          : Number(rawIsActive);

    if (![0, 1].includes(nextIsActive)) {
      return res.status(400).json({ message: "Invalid user status" });
    }

    const [result] = await db.query("UPDATE users SET is_active = ? WHERE id = ?", [
      nextIsActive,
      normalizedUserId,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message:
        nextIsActive === 1
          ? "Customer activated successfully"
          : "Customer unactivated successfully",
      userId: normalizedUserId,
      is_active: nextIsActive,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCustomers,
  updateCustomerStatus,
};