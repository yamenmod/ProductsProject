const db = require("../db/connection");

const getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      "SELECT id, name, description FROM categories ORDER BY name ASC",
    );
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCategories,
};
