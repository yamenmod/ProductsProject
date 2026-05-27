const db = require("../db/connection");

// Category lookup for storefront filters.

const getCategories = async (req, res) => {
  try {
    // Return categories alphabetically for the UI selector.
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
