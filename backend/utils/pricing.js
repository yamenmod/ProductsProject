const VAT_RATE = 0.18; // Default, but should be overridden by database value

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const calculateVatPricing = (basePrice, vatRate = VAT_RATE) => {
  const safeBasePrice = roundMoney(basePrice);
  const safeVatRate = Math.min(Math.max(vatRate || VAT_RATE, 0), 1); // Ensure between 0 and 1
  const vatAmount = roundMoney(safeBasePrice * safeVatRate);
  const finalPrice = roundMoney(safeBasePrice + vatAmount);

  return {
    basePrice: safeBasePrice,
    vatAmount,
    finalPrice,
    vatRate: safeVatRate,
  };
};

const getVatRateFromDb = async (db) => {
  try {
    const [rows] = await db.query("SELECT value FROM settings WHERE key_name = 'vat_rate'");
    if (rows && rows.length > 0) {
      const rate = parseFloat(rows[0].value);
      return isNaN(rate) ? VAT_RATE : rate;
    }
  } catch (error) {
    console.error("Error fetching VAT rate from database:", error);
  }
  return VAT_RATE;
};

module.exports = {
  VAT_RATE,
  roundMoney,
  calculateVatPricing,
  getVatRateFromDb,
};