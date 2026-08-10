const db = require("../db/connection");

// Admin user management helpers.

const getTopProducts = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    let dateFilter = "";
    const params = [];

    if (fromDate || toDate) {
      dateFilter = " AND ";
      const conditions = [];

      if (fromDate) {
        conditions.push("DATE(o.created_at) >= ?");
        params.push(fromDate);
      }

      if (toDate) {
        conditions.push("DATE(o.created_at) <= ?");
        params.push(toDate);
      }

      dateFilter += conditions.join(" AND ");
    }

    // Get top 3 products by total quantity sold from completed/successful orders
    const [rows] = await db.query(
      `
      SELECT 
        oi.product_id,
        oi.name,
        SUM(oi.quantity) as total_sold
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('paid', 'success', 'successful', 'completed')${dateFilter}
      GROUP BY oi.product_id, oi.name
      ORDER BY total_sold DESC
      LIMIT 3
      `,
      params
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("[admin:getTopProducts]", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getCategorySales = async (req, res) => {
  try {
    const { category, fromDate, toDate } = req.query;

    console.log("[admin:getCategorySales] Request:", { category, fromDate, toDate });

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    let dateConditions = [];
    const params = [];

    if (fromDate) {
      dateConditions.push("DATE(o.created_at) >= ?");
      params.push(fromDate);
    }

    if (toDate) {
      dateConditions.push("DATE(o.created_at) <= ?");
      params.push(toDate);
    }

    const dateFilter = dateConditions.length > 0 
      ? " AND " + dateConditions.join(" AND ")
      : "";

    params.push(category);

    console.log("[admin:getCategorySales] SQL params:", params);

    // First, get all products in the category (regardless of sales)
    // Then LEFT JOIN with order data to get sales within the date range
    // This separates product existence from sales calculation
    const [rows] = await db.query(
      `
      SELECT 
        p.id as product_id,
        p.name,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      LEFT JOIN order_items oi ON oi.product_id = p.id
        AND oi.order_id IN (
          SELECT o.id FROM orders o 
          WHERE o.status IN ('paid', 'success', 'successful', 'completed')
          ${dateFilter}
        )
      WHERE LOWER(c.name) = LOWER(?)
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC, p.name ASC
      `,
      params
    );

    console.log("[admin:getCategorySales] Result count:", rows.length);
    console.log("[admin:getCategorySales] Result:", rows);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("[admin:getCategorySales]", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name FROM categories 
       WHERE name NOT IN ('Fins', 'Leashes', 'Surfboard Cases')
       ORDER BY name ASC`
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error("[admin:getAllCategories]", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // Fetch users newest first so the admin list stays readable.
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

    // Set user_id to NULL in all orders for this user to preserve order history
    await db.query(
      "UPDATE orders SET user_id = NULL WHERE user_id = ?",
      [userId],
    );

    // Now delete the user
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
  getTopProducts,
  getCategorySales,
  getAllCategories,
  getAllUsers,
  deleteUser,
};
