const db = require("../db/connection");

const getMaxQuantityPerCart = async () => {
  try {
    const [result] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'max_quantity_per_cart' LIMIT 1",
    );

    if (result.length > 0) {
      const val = Number(result[0].value);

      // Accept any positive whole number set by the admin
      return Number.isInteger(val) && val > 0 ? val : 12;
    }

    // Default value if the setting does not exist
    return 12;
  } catch (error) {
    console.error("[settings:getMaxQuantityPerCart]", error.message);

    // Fallback if the database cannot be reached
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
