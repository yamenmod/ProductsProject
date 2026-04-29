const db = require("../db/connection");

const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC`,
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    if (req.user?.id === userId) {
      return res
        .status(403)
        .json({ message: "You cannot delete the logged-in admin account" });
    }

    const [result] = await db.query("DELETE FROM users WHERE id = ?", [userId]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ message: "Customer deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
};
