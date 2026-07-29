const validateProductQuantityLimit = ({
  currentQuantity,
  requestedQuantity,
  maxQuantityPerProduct,
}) => {
  const normalizedCurrentQuantity = Number(currentQuantity) || 0;
  const normalizedRequestedQuantity = Number(requestedQuantity) || 0;
  const normalizedMaxQuantity = Number(maxQuantityPerProduct) || 0;

  if (!normalizedMaxQuantity) {
    return { allowed: true, message: null };
  }

  const nextQuantity = normalizedCurrentQuantity + normalizedRequestedQuantity;

  if (nextQuantity > normalizedMaxQuantity) {
    return {
      allowed: false,
      message: `You have reached the maximum quantity limit of ${normalizedMaxQuantity} items per product.`,
      maxQuantity: normalizedMaxQuantity,
      currentQuantity: normalizedCurrentQuantity,
      requestedQuantity: normalizedRequestedQuantity,
    };
  }

  return {
    allowed: true,
    message: null,
    maxQuantity: normalizedMaxQuantity,
    currentQuantity: normalizedCurrentQuantity,
    requestedQuantity: normalizedRequestedQuantity,
  };
};

module.exports = {
  validateProductQuantityLimit,
};
