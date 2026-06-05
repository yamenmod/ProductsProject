// Cart hold order system has been removed as part of removing Pending status
// Orders are now created directly with SUCCESS status after payment completion
// Stock validation happens at checkout time

module.exports = {
  CART_HOLD_PAYMENT_STATUS: "cart_hold",
  findCartHoldOrderId: async () => null,
  clearCartHoldOrder: async () => null,
  rebuildCartHoldOrder: async () => null,
  restoreOrderItemStock: async () => {},
  cleanupExpiredCartHoldOrders: async () => 0,
};
