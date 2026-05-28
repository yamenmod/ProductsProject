const normalizeSizeStockMap = (value) => {
  if (!value) {
    return null;
  }

  let source = value;

  if (typeof source === "string") {
    const trimmed = source.trim();

    if (!trimmed) {
      return null;
    }

    try {
      source = JSON.parse(trimmed);
    } catch (error) {
      const pairs = trimmed
        .split(/[;,\n]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const separatorIndex = part.indexOf(":");

          if (separatorIndex === -1) {
            return null;
          }

          const size = part.slice(0, separatorIndex).trim().toUpperCase();
          const stockValue = Number(part.slice(separatorIndex + 1));

          if (!size || !Number.isFinite(stockValue) || stockValue < 0) {
            return null;
          }

          return [size, Math.floor(stockValue)];
        })
        .filter(Boolean);

      return pairs.length ? Object.fromEntries(pairs) : null;
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  const normalized = Object.entries(source).reduce((accumulator, [key, value]) => {
    const size = (key || "").toString().trim().toUpperCase();
    const stockValue = Number(value);

    if (!size || !Number.isFinite(stockValue) || stockValue < 0) {
      return accumulator;
    }

    accumulator[size] = Math.floor(stockValue);
    return accumulator;
  }, {});

  return Object.keys(normalized).length ? normalized : null;
};

const parseSizeStockInput = (value) => normalizeSizeStockMap(value);

const serializeSizeStock = (value) => {
  const normalized = normalizeSizeStockMap(value);
  return normalized ? JSON.stringify(normalized) : null;
};

const getSizeStockTotal = (value) => {
  const normalized = normalizeSizeStockMap(value);

  if (!normalized) {
    return 0;
  }

  return Object.values(normalized).reduce(
    (total, stock) => total + (Number(stock) || 0),
    0,
  );
};

const getAvailableStock = (product, size) => {
  const normalizedSize = (size || "").toString().trim().toUpperCase();
  const sizeStock = normalizeSizeStockMap(product?.size_stock);

  if (sizeStock) {
    if (!normalizedSize) {
      return 0;
    }

    return Number(sizeStock[normalizedSize] || 0);
  }

  return Number(product?.stock) || 0;
};

module.exports = {
  normalizeSizeStockMap,
  parseSizeStockInput,
  serializeSizeStock,
  getSizeStockTotal,
  getAvailableStock,
};