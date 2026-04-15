const express = require("express");
const {
  getCart,
  addToCart,
  removeFromCart,
  checkout,
  getAdminOrders,
} = require("../controllers/cartController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// All cart actions require a logged-in user.
// Checkout stays protected here so only authenticated sessions can place orders.
router.get("/", authMiddleware, getCart);
router.post("/", authMiddleware, addToCart);
router.delete("/:productId", authMiddleware, removeFromCart);
router.post("/checkout", authMiddleware, checkout);

// Admin-only order listing used by the Manage orders page.
// The admin middleware blocks everyone except users with the admin role.
router.get("/admin/orders", authMiddleware, adminMiddleware, getAdminOrders);

module.exports = router;
