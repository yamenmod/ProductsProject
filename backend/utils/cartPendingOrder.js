const {
  normalizeSizeStockMap,
  serializeSizeStock,
  getSizeStockTotal,
} = require("./sizeStock");
const {
  calculateVatPricing,
  roundMoney,
  getVatRateFromDb,
} = require("./pricing");
const {
  ORDER_STATUS,
  CART_HOLD_PAYMENT_STATUS,
} = require("./orderStatus");

const parseSizeFromItemName = (name) => {
  const match = (name || "").match(/\(\s*Size\s*([^\)]+)\s*\)/i);
  return match && match[1] ? match[1].toUpperCase() : "";
};

const restoreOrderItemStock = async (connection, item) => {
  const [products] = await connection.query(
    "SELECT * FROM products WHERE id = ? LIMIT 1 FOR UPDATE",
    [item.product_id],
  );

  if (!products.length) {
    return;
  }

  const product = products[0];
  const sizeStock = normalizeSizeStockMap(product.size_stock);
  const qty = Number(item.quantity || 0);

  if (sizeStock) {
    const size = parseSizeFromItemName(item.name);
    if (!size) {
      return;
    }

    const next = { ...sizeStock };
    next[size] = Number(next[size] || 0) + qty;
    await connection.query(
      "UPDATE products SET stock = ?, size_stock = ?, updated_at = NOW() WHERE id = ?",
      [getSizeStockTotal(next), serializeSizeStock(next), item.product_id],
    );
    return;
  }

  await connection.query(
    "UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?",
    [qty, item.product_id],
  );
};

const deductProductStock = async (
  connection,
  product,
  quantity,
  normalizedSize,
) => {
  const sizeStock = normalizeSizeStockMap(product.size_stock);
  const qty = Number(quantity || 0);

  if (sizeStock && normalizedSize) {
    const available = Number(sizeStock[normalizedSize] || 0);
    if (qty > available) {
      throw new Error(`Only ${available} items left in stock`);
    }

    const next = { ...sizeStock };
    next[normalizedSize] = available - qty;
    await connection.query(
      "UPDATE products SET stock = ?, size_stock = ?, updated_at = NOW() WHERE id = ?",
      [getSizeStockTotal(next), serializeSizeStock(next), product.id],
    );
    return;
  }

  const available = Number(product.stock || 0);
  if (qty > available) {
    throw new Error(`Only ${available} items left in stock`);
  }

  await connection.query(
    "UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?",
    [qty, product.id],
  );
};

const findCartHoldOrderId = async (connection, userId) => {
  const [rows] = await connection.query(
    `
      SELECT o.id
      FROM orders o
      WHERE o.user_id = ?
        AND o.order_status = ?
        AND o.payment_status = ?
        AND NOT EXISTS (
          SELECT 1 FROM payments p WHERE p.order_id = o.id
        )
      ORDER BY o.id DESC
      LIMIT 1
    `,
    [userId, ORDER_STATUS.PENDING, CART_HOLD_PAYMENT_STATUS],
  );

  return rows[0]?.id || null;
};

const clearCartHoldOrder = async (connection, userId) => {
  const orderId = await findCartHoldOrderId(connection, userId);
  if (!orderId) {
    return null;
  }

  const [items] = await connection.query(
    "SELECT product_id, quantity, name FROM order_items WHERE order_id = ?",
    [orderId],
  );

  for (const item of items) {
    await restoreOrderItemStock(connection, item);
  }

  await connection.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
  await connection.query(
    `UPDATE orders
     SET status = ?, order_status = ?, payment_status = ?, cancelled_at = NOW()
     WHERE id = ?`,
    [ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCELLED, "cancelled", orderId],
  );

  return orderId;
};

const rebuildCartHoldOrder = async (connection, userId, db) => {
  const [cartRows] = await connection.query(
    `
      SELECT
        p.id,
        p.name,
        p.price,
        p.stock,
        p.size_stock,
        c.name AS category,
        ci.size,
        ci.quantity
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ci.user_id = ?
    `,
    [userId],
  );

  if (!cartRows.length) {
    await clearCartHoldOrder(connection, userId);
    return null;
  }

  const vatRate = await getVatRateFromDb(db);
  let orderId = await findCartHoldOrderId(connection, userId);

  if (orderId) {
    const [existingItems] = await connection.query(
      "SELECT product_id, quantity, name FROM order_items WHERE order_id = ?",
      [orderId],
    );

    for (const item of existingItems) {
      await restoreOrderItemStock(connection, item);
    }

    await connection.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
  } else {
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, total, status, payment_status, order_status, created_at)
       VALUES (?, 0, ?, ?, ?, NOW())`,
      [
        userId,
        ORDER_STATUS.PENDING,
        CART_HOLD_PAYMENT_STATUS,
        ORDER_STATUS.PENDING,
      ],
    );
    orderId = orderResult.insertId;
  }

  let total = 0;

  for (const item of cartRows) {
    const [products] = await connection.query(
      `SELECT p.id, p.name, p.price, p.stock, p.size_stock, c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?
       LIMIT 1 FOR UPDATE`,
      [item.id],
    );

    if (!products.length) {
      throw new Error(`Product ${item.id} not found`);
    }

    const product = products[0];
    const normalizedSize = (item.size || "").toString().trim().toUpperCase();
    const qty = Number(item.quantity || 0);
    const displayName = normalizedSize
      ? `${product.name} (Size ${normalizedSize})`
      : product.name;

    await deductProductStock(connection, product, qty, normalizedSize);

    const pricing = calculateVatPricing(product.price, vatRate);
    const lineTotal = roundMoney(pricing.finalPrice * qty);
    total = roundMoney(total + lineTotal);

    await connection.query(
      "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
      [orderId, item.id, displayName, pricing.finalPrice, qty],
    );
  }

  await connection.query(
    `UPDATE orders
     SET total = ?, status = ?, order_status = ?, payment_status = ?, cancelled_at = NULL
     WHERE id = ?`,
    [
      total,
      ORDER_STATUS.PENDING,
      ORDER_STATUS.PENDING,
      CART_HOLD_PAYMENT_STATUS,
      orderId,
    ],
  );

  return orderId;
};

module.exports = {
  CART_HOLD_PAYMENT_STATUS,
  findCartHoldOrderId,
  clearCartHoldOrder,
  rebuildCartHoldOrder,
  restoreOrderItemStock,
};
