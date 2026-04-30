import axios from "axios";

const VAT_RATE = 0.18; // Default, will be fetched from backend

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

let cachedVatRate = null;
let vatRateFetchPromise = null;

// Fetch current VAT rate from backend
const fetchVatRate = async () => {
  if (cachedVatRate !== null) {
    return cachedVatRate;
  }

  // Prevent multiple simultaneous requests
  if (vatRateFetchPromise) {
    return vatRateFetchPromise;
  }

  vatRateFetchPromise = (async () => {
    try {
      const response = await axios.get("/api/admin/settings/vat_rate");
      if (response.data && response.data.value) {
        const rate = parseFloat(response.data.value);
        if (!isNaN(rate)) {
          cachedVatRate = rate;
          return rate;
        }
      }
    } catch (error) {
      console.warn("Failed to fetch VAT rate, using default:", error.message);
    }
    cachedVatRate = VAT_RATE;
    return VAT_RATE;
  })();

  const result = await vatRateFetchPromise;
  vatRateFetchPromise = null;
  return result;
};

// Reset cache when VAT rate is updated
const resetVatRateCache = () => {
  cachedVatRate = null;
};

const getCurrentVatRate = () => cachedVatRate ?? VAT_RATE;

const getBasePrice = (product) => roundMoney(product?.basePrice ?? product?.price ?? 0);

const getVatAmount = (product) => {
  if (product?.vatAmount !== undefined && product?.vatAmount !== null) {
    return roundMoney(product.vatAmount);
  }

  return roundMoney(getBasePrice(product) * (getCurrentVatRate() || VAT_RATE));
};

const getDisplayPrice = (product) => {
  if (!product) {
    return 0;
  }

  if (product.finalPrice !== undefined && product.finalPrice !== null) {
    return roundMoney(product.finalPrice);
  }

  return roundMoney(product.price);
};

export {
  VAT_RATE,
  roundMoney,
  getBasePrice,
  getVatAmount,
  getDisplayPrice,
  fetchVatRate,
  getCurrentVatRate,
  resetVatRateCache,
};