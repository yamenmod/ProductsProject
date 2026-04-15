const db = require("../db/connection");

const resolvePrimaryImage = (value) => {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.find(Boolean) || "";
  }

  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(trimmedValue);
      const imageValue = Array.isArray(parsedValue)
        ? parsedValue.find(Boolean) || ""
        : trimmedValue;

      if (!imageValue) {
        return "";
      }

      if (
        imageValue.startsWith("http://") ||
        imageValue.startsWith("https://")
      ) {
        return imageValue;
      }

      if (imageValue.startsWith("/uploads/")) {
        return imageValue;
      }

      return `/uploads/${imageValue.replace(/^\/+/, "")}`;
    } catch (error) {
      return trimmedValue;
    }
  }

  if (trimmedValue.startsWith("data:") || trimmedValue.startsWith("blob:")) {
    return trimmedValue;
  }

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://")
  ) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/uploads/")) {
    return trimmedValue;
  }

  return `/uploads/${trimmedValue.replace(/^\/+/, "")}`;
};

// Converts raw cart rows into the shape the frontend already expects.
// This keeps the API response consistent across cart actions.
const mapCartRows = (rows) =>
  rows.map((row) => ({
    product: {
      _id: row.id,
      id: row.id,
      name: row.name,
      price: Number(row.price),
      stock: Number(row.stock),
      category: row.category || "",
      image: resolvePrimaryImage(row.image_url),
    },
    quantity: Number(row.quantity),
  }));

// Reads the signed-in user's cart and returns the current items and totals.
// The query joins products and categories so the frontend can render details.
const getCart = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.name AS category,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
        ORDER BY ci.id DESC
      `,
      [req.user.id],
    );

    return res.status(200).json(mapCartRows(rows));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Adds or updates a cart item for the current user.
// It validates the product first, then returns the refreshed cart state.
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    const [products] = await db.query(
      "SELECT id FROM products WHERE id = ? LIMIT 1",
      [productId],
    );
    if (!products.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );
    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [existingItems] = await db.query(
      "SELECT id FROM cart_items WHERE user_id = ? AND product_id = ? LIMIT 1",
      [req.user.id, productId],
    );

    if (existingItems.length) {
      await db.query(
        "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
        [qty, existingItems[0].id],
      );
    } else {
      await db.query(
        "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
        [req.user.id, productId, qty],
      );
    }

    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.name AS category,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
        ORDER BY ci.id DESC
      `,
      [req.user.id],
    );

    return res.status(200).json(mapCartRows(rows));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Removes one product from the current user's cart.
// The response again returns the updated cart so the UI stays in sync.
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    await db.query(
      "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
      [req.user.id, productId],
    );

    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.name AS category,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
        ORDER BY ci.id DESC
      `,
      [req.user.id],
    );

    return res.status(200).json(mapCartRows(rows));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Converts the user's cart into a paid order and clears the cart afterward.
// This is the checkout flow that creates the order records seen by admin.
const checkout = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [cartRows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = ?
      `,
      [req.user.id],
    );

    if (!cartRows.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total = 0;
    const items = [];

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (const item of cartRows) {
        if (Number(item.stock) < Number(item.quantity)) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: `Not enough stock for ${item.name}`,
          });
        }

        await connection.query(
          "UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?",
          [Number(item.quantity), item.id],
        );

        const subtotal = Number(item.price) * Number(item.quantity);
        total += subtotal;

        items.push({
          product: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
        });
      }

      const [orderResult] = await connection.query(
        "INSERT INTO orders (user_id, total, status, created_at) VALUES (?, ?, 'paid', NOW())",
        [req.user.id, total],
      );

      for (const item of items) {
        await connection.query(
          "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
          [
            orderResult.insertId,
            item.product,
            item.name,
            item.price,
            item.quantity,
          ],
        );
      }

      await connection.query("DELETE FROM cart_items WHERE user_id = ?", [
        req.user.id,
      ]);
      await connection.commit();
      connection.release();

      return res.status(200).json({
        message: "Purchase completed successfully",
        order: {
          id: orderResult.insertId,
          items,
          total,
          status: "paid",
        },
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      return res.status(500).json({ message: "Server error" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Returns every order for the admin dashboard.
// The admin page uses this list to show customer, amount, and payment status.
const getAdminOrders = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          o.id,
          o.user_id,
          u.username,
          u.email,
          o.total,
          o.status,
          o.created_at,
          COUNT(oi.id) AS item_count
        FROM orders o
        JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id, o.user_id, u.username, u.email, o.total, o.status, o.created_at
        ORDER BY o.created_at DESC, o.id DESC
      `,
    );

    return res.status(200).json(
      rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        total: Number(row.total),
        status: row.status,
        itemCount: Number(row.item_count),
        createdAt: row.created_at,
      })),
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  checkout,
  getAdminOrders,
};
