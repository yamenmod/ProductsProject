export const ORDER_STATUS_LABELS = {
  success: "Successful",
  cancelled: "Cancel",
};

const normalizeStatus = (value) =>
  (value || "").toString().trim().toLowerCase();

export const getOrderBucket = (order) => {
  const status = normalizeStatus(order?.status || order?.order_status);

  if (["paid", "success", "successful", "completed"].includes(status)) {
    return "success";
  }

  if (["cancelled", "canceled", "unsuccessful", "failed"].includes(status)) {
    return "cancelled";
  }

  // Default to cancelled for unrecognized statuses
  return "cancelled";
};

export const getOrderStatusLabel = (order) => {
  const bucket = getOrderBucket(order);
  return ORDER_STATUS_LABELS[bucket] || ORDER_STATUS_LABELS.cancelled;
};

export const getUserFacingOrderBucket = (order) => {
  const bucket = getOrderBucket(order);
  return bucket;
};
