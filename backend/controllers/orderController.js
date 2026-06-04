const db = require("../db/connection");
const {
  normalizeSizeStockMap,
  serializeSizeStock,
  getSizeStockTotal,
} = require("../utils/sizeStock");
const { ORDER_STATUS, syncOrderStatusFields } = require("../utils/orderStatus");


const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await db.query(
      `SELECT id, user_id, total, status, payment_status, order_status, created_at, paid_at, cancelled_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    const results = [];
    for (const o of orders) {
      const [items] = await db.query(
        "SELECT product_id, name, price, quantity FROM order_items WHERE order_id = ?",
        [o.id],
      );

      results.push({ ...o, items });
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("[orders:getMyOrders]", error.message || error);
    return res.status(500).json({ message: "Server error" });
  }
};

const paySuccess = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).json({ message: "Order id required" });

    const [orders] = await db.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [orderId]);
    if (!orders.length) return res.status(404).json({ message: "Order not found" });

    const order = orders[0];

    // Mark order as successful
    const synced = syncOrderStatusFields(ORDER_STATUS.SUCCESS);
    await db.query(
      "UPDATE orders SET status = ?, payment_status = ?, order_status = ?, paid_at = NOW() WHERE id = ?",
      [synced.status, synced.payment_status, synced.order_status, orderId],
    );

    return res.status(200).json({ message: "Order marked as paid and successful" });
  } catch (error) {
    console.error("[orders:paySuccess]", error.message || error);
    return res.status(500).json({ message: "Server error" });
  }
};

const cancel = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).json({ message: "Order id required" });

    const [orders] = await db.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [orderId]);
    if (!orders.length) return res.status(404).json({ message: "Order not found" });

    const order = orders[0];

    // Only owner can cancel
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Must be paid and within 48 hours
    const orderBucket =
      order.order_status === ORDER_STATUS.SUCCESS || order.status === ORDER_STATUS.SUCCESS
        ? ORDER_STATUS.SUCCESS
        : order.order_status || order.status;

    if (orderBucket !== ORDER_STATUS.SUCCESS) {
      return res.status(400).json({ message: "Only successful orders can be cancelled" });
    }

    if (!order.paid_at) {
      return res.status(400).json({ message: "Only paid orders can be cancelled" });
    }

    const paidAt = new Date(order.paid_at);
    const now = new Date();
    //const ms48 = 48 * 60 * 60 * 1000;
    const ms48 = 60;
    if (now - paidAt > ms48) {
      return res.status(400).json({ message: "Cancellation window expired" });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Restore stock for items
      const [items] = await connection.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
        [orderId],
      );

      for (const it of items) {
        const [products] = await connection.query(
          "SELECT * FROM products WHERE id = ? LIMIT 1 FOR UPDATE",
          [it.product_id],
        );
        if (!products.length) continue;
        const product = products[0];
        const sizeStock = normalizeSizeStockMap(product.size_stock);

        if (sizeStock) {
          // We don't know sizes in order_items currently; assume single-size orders stored in name
          // Try to detect size from name
          const [oItemRows] = await connection.query(
            "SELECT name FROM order_items WHERE order_id = ? AND product_id = ? LIMIT 1",
            [orderId, it.product_id],
          );
          let size = "";
          if (oItemRows.length) {
            const nm = oItemRows[0].name || "";
            const m = nm.match(/\(\s*Size\s*([^\)]+)\s*\)/i);
            if (m && m[1]) size = m[1].toUpperCase();
          }

          if (size) {
            const next = { ...sizeStock };
            next[size] = (Number(next[size] || 0) + Number(it.quantity || 0));
            await connection.query(
              "UPDATE products SET stock = ?, size_stock = ?, updated_at = NOW() WHERE id = ?",
              [getSizeStockTotal(next), serializeSizeStock(next), it.product_id],
            );
          } else {
            // If size not found, skip
            continue;
          }
        } else {
          await connection.query(
            "UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?",
            [it.quantity, it.product_id],
          );
        }
      }

      const synced = syncOrderStatusFields(ORDER_STATUS.CANCELLED);
      await connection.query(
        "UPDATE orders SET status = ?, order_status = ?, payment_status = ?, cancelled_at = NOW() WHERE id = ?",
        [synced.status, synced.order_status, "refunded", orderId],
      );

      await connection.commit();
      connection.release();

      return res.status(200).json({ message: "Order cancelled and stock restored" });
    } catch (txErr) {
      await connection.rollback();
      connection.release();
      console.error("[orders:cancel]", txErr.message || txErr);
      return res.status(500).json({ message: "Server error" });
    }
  } catch (error) {
    console.error("[orders:cancel]", error.message || error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      "SELECT id, user_id, total, payment_status, order_status, created_at, paid_at, cancelled_at FROM orders ORDER BY created_at DESC",
    );

    const results = [];
    for (const o of orders) {
      const [items] = await db.query(
        "SELECT product_id, name, price, quantity FROM order_items WHERE order_id = ?",
        [o.id],
      );

      results.push({ ...o, items });
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("[orders:getAllOrders]", error.message || error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getMyOrders,
  paySuccess,
  cancel,
  getAllOrders,
};
