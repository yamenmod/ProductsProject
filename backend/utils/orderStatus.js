const ORDER_STATUS = {
  SUCCESS: "success",
  CANCELLED: "cancelled",
};

const CART_HOLD_PAYMENT_STATUS = "cart_hold";

const normalizeStatus = (value) =>
  (value || "").toString().trim().toLowerCase();

const syncOrderStatusFields = (status) => {
  const normalized = normalizeStatus(status);

  if (["paid", "success", "successful", "completed"].includes(normalized)) {
    return {
      status: ORDER_STATUS.SUCCESS,
      order_status: ORDER_STATUS.SUCCESS,
      payment_status: "paid",
    };
  }

  if (["cancelled", "canceled", "unsuccessful", "failed"].includes(normalized)) {
    return {
      status: ORDER_STATUS.CANCELLED,
      order_status: ORDER_STATUS.CANCELLED,
      payment_status: "cancelled",
    };
  }

  // Default to cancelled if status is unrecognized
  return {
    status: ORDER_STATUS.CANCELLED,
    order_status: ORDER_STATUS.CANCELLED,
    payment_status: "cancelled",
  };
};

module.exports = {
  ORDER_STATUS,
  CART_HOLD_PAYMENT_STATUS,
  normalizeStatus,
  syncOrderStatusFields,
};
