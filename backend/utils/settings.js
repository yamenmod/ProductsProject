const db = require("../db/connection");

const getMaxQuantityPerCart = async () => {
  try {
    const [result] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'max_quantity_per_cart' LIMIT 1",
    );

    if (result.length > 0) {
      const val = Number(result[0].value);
      return Number.isFinite(val) && val > 0 ? val : 12;
    }

    return 12;
  } catch (error) {
    console.error("[settings:getMaxQuantityPerCart]", error.message);
    return 12;
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

module.exports = {
  getMaxQuantityPerCart,
  getVatRate,
};
