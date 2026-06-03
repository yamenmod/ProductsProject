export const ORDER_STATUS_LABELS = {
  success: "Successful",
  cancelled: "Cancelled",
  pending: "Pending",
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

  if (
    ["pending", "processing", "awaiting_payment", "open", "draft"].includes(
      status,
    )
  ) {
    return "pending";
  }

  return "pending";
};

export const getOrderStatusLabel = (order) => {
  const bucket = getOrderBucket(order);
  return ORDER_STATUS_LABELS[bucket] || ORDER_STATUS_LABELS.pending;
};

export const getUserFacingOrderBucket = (order) => {
  const bucket = getOrderBucket(order);
  return bucket === "pending" ? null : bucket;
};
