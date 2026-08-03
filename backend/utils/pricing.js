const DEFAULT_VAT_RATE = Number(process.env.DEFAULT_VAT_RATE || 0);

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const calculateVatPricing = (basePrice, vatRate = DEFAULT_VAT_RATE) => {
  const safeBasePrice = roundMoney(basePrice);
  const safeVatRate = Math.min(Math.max(vatRate ?? DEFAULT_VAT_RATE, 0), 1); // Ensure between 0 and 1
  const vatAmount = roundMoney(safeBasePrice * safeVatRate);
  const finalPrice = roundMoney(safeBasePrice + vatAmount);

  return {
    basePrice: safeBasePrice,
    vatAmount,
    finalPrice,
    vatRate: safeVatRate,
  };
};

const splitVatInclusivePricing = (totalPrice, vatRate = DEFAULT_VAT_RATE) => {
  const finalPrice = roundMoney(totalPrice);
  const safeVatRate = Math.min(Math.max(vatRate ?? DEFAULT_VAT_RATE, 0), 1);

  if (finalPrice <= 0) {
    return {
      basePrice: 0,
      vatAmount: 0,
      finalPrice: 0,
      vatRate: safeVatRate,
    };
  }

  const divisor = 1 + safeVatRate;
  const basePrice = roundMoney(divisor > 0 ? finalPrice / divisor : finalPrice);
  const vatAmount = roundMoney(finalPrice - basePrice);

  return {
    basePrice,
    vatAmount,
    finalPrice,
    vatRate: safeVatRate,
  };
};

const getVatRateFromDb = async (db) => {
  try {
    const [rows] = await db.query(
      "SELECT value FROM settings WHERE key_name = 'vat_rate'",
    );
    if (rows && rows.length > 0) {
      const rate = parseFloat(rows[0].value);
      return isNaN(rate) ? DEFAULT_VAT_RATE : rate;
    }
  } catch (error) {
    console.error("Error fetching VAT rate from database:", error);
  }
  return DEFAULT_VAT_RATE;
};

module.exports = {
  DEFAULT_VAT_RATE,
  roundMoney,
  calculateVatPricing,
  splitVatInclusivePricing,
  getVatRateFromDb,
};
