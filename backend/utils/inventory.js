const db = require("../db/connection");
const { normalizeSizeStockMap, getSizeStockTotal } = require("./sizeStock");

// Compute available stock considering all carts.
// Returns a number >= 0.
const getRealAvailableStock = async (productId, size = "") => {
  const normalizedSize = (size || "").toString().trim().toUpperCase();

  const [rows] = await db.query(
    "SELECT stock, size_stock FROM products WHERE id = ? LIMIT 1",
    [productId],
  );

  if (!rows.length) return 0;

  const product = rows[0];
  const sizeStock = normalizeSizeStockMap(product.size_stock);

  let totalStock = 0;
  if (sizeStock) {
    if (normalizedSize) {
      totalStock = Number(sizeStock[normalizedSize] || 0);
    } else {
      totalStock = getSizeStockTotal(sizeStock);
    }
  } else {
    totalStock = Number(product.stock) || 0;
  }

  // Reserved in all carts
  let reservedCart = 0;
  if (sizeStock && normalizedSize) {
    const [rc] = await db.query(
      "SELECT COALESCE(SUM(quantity),0) AS reserved FROM cart_items WHERE product_id = ? AND size = ?",
      [productId, normalizedSize],
    );
    reservedCart = Number(rc[0].reserved || 0);
  } else {
    const [rc] = await db.query(
      "SELECT COALESCE(SUM(quantity),0) AS reserved FROM cart_items WHERE product_id = ?",
      [productId],
    );
    reservedCart = Number(rc[0].reserved || 0);
  }

  const available = Math.max(0, totalStock - reservedCart);
  return available;
};

module.exports = {
  getRealAvailableStock,
};
