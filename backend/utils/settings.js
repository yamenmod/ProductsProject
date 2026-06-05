const db = require("../db/connection");

const getMaxProductsPerCart = async () => {
  try {
    const [result] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'max_products_per_cart' LIMIT 1",
    );

    if (result.length > 0) {
      const val = Number(result[0].value);
      return Number.isFinite(val) && val > 0 ? val : 10;
    }

    return 10;
  } catch (error) {
    console.error("[settings:getMaxProductsPerCart]", error.message);
    return 10;
  }
};

const getMaxQuantityPerProduct = async () => {
  try {
    const [result] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'max_quantity_per_product' LIMIT 1",
    );

    if (result.length > 0) {
      const val = Number(result[0].value);
      return Number.isFinite(val) && val > 0 ? val : 10;
    }

    return 10;
  } catch (error) {
    console.error("[settings:getMaxQuantityPerProduct]", error.message);
    return 10;
  }
};

const getVatRate = async () => {
  try {
    const [result] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'vat_rate' LIMIT 1",
    );

    if (result.length > 0) {
      return Number(result[0].value) || 0;
    }

    return 0;
  } catch (error) {
    console.error("[settings:getVatRate]", error.message);
    return 0;
  }
};

const getMaxQuantityPerUser = async () => {
  try {
    const [result] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'max_quantity_per_user' LIMIT 1",
    );

    if (result.length > 0) {
      const val = Number(result[0].value);
      return Number.isFinite(val) && val > 0 ? val : 10;
    }

    return 10;
  } catch (error) {
    console.error("[settings:getMaxQuantityPerUser]", error.message);
    return 10;
  }
};

module.exports = {
  getMaxProductsPerCart,
  getMaxQuantityPerProduct,
  getVatRate,
  getMaxQuantityPerUser,
};
