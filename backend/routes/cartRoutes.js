const express = require("express");
const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  checkout,
  getAdminOrders,
  quickCheckout,
  createPaypalConfig,
  createPaypalOrder,
  capturePaypalOrder,
  handlePaypalSuccessReturn,
  handlePaypalCancelReturn,
  cancelPaypalOrder,
  getOrderItems,
} = require("../controllers/cartController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// All cart actions require a logged-in user.
// Checkout stays protected here so only authenticated sessions can place orders.
router.get("/", authMiddleware, getCart);
router.post("/", authMiddleware, addToCart);
router.delete("/:productId", authMiddleware, removeFromCart);
router.patch("/:productId", authMiddleware, updateCartQuantity);
router.post("/checkout", authMiddleware, checkout);
router.post("/quick", authMiddleware, quickCheckout);
router.get("/paypal/success", handlePaypalSuccessReturn);
router.get("/paypal/cancel", handlePaypalCancelReturn);
router.get("/paypal/config", authMiddleware, createPaypalConfig);
router.post("/paypal/create-order", authMiddleware, createPaypalOrder);
router.post("/paypal/capture", authMiddleware, capturePaypalOrder);
router.post("/paypal/cancel", authMiddleware, cancelPaypalOrder);

// Admin-only order listing used by the Manage orders page.
// The admin middleware blocks everyone except users with the admin role.
router.get("/admin/orders", authMiddleware, adminMiddleware, getAdminOrders);
router.get("/admin/orders/:orderId/items", authMiddleware, adminMiddleware, getOrderItems);

module.exports = router;
