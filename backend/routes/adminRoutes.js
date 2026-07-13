const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  getCustomers,
  deleteCustomer,
} = require("../controllers/customerController");
const {
  getSetting,
  getAllSettings,
  updateSetting,
} = require("../controllers/settingsController");
const {
  getAllOrders,
  markAsCompleted,
} = require("../controllers/orderController");

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, getCustomers);
router.delete(
  "/users/:userId",
  authMiddleware,
  adminMiddleware,
  deleteCustomer,
);
router.get("/customers", authMiddleware, adminMiddleware, getCustomers);
router.delete(
  "/customers/:userId",
  authMiddleware,
  adminMiddleware,
  deleteCustomer,
);

// Public endpoint to get current VAT rate (no auth required)
router.get("/settings/vat_rate", (req, res) => {
  req.params.key = "vat_rate";
  return getSetting(req, res);
});

// Public endpoint to get max quantity per cart (no auth required)
router.get("/settings/max_quantity_per_cart", (req, res) => {
  req.params.key = "max_quantity_per_cart";
  return getSetting(req, res);
});

// Legacy endpoint for max quantity per product (redirect to new setting)
router.get("/max-quantity-per-product", (req, res) => {
  req.params.key = "max_quantity_per_cart";
  return getSetting(req, res);
});

// Legacy endpoint for vat rate (redirect to new setting)
router.get("/vat-rate", (req, res) => {
  req.params.key = "vat_rate";
  return getSetting(req, res);
});

// Settings endpoints (admin only)
router.get("/settings", authMiddleware, adminMiddleware, getAllSettings);
router.get("/settings/:key", authMiddleware, adminMiddleware, getSetting);
router.put("/settings/:key", authMiddleware, adminMiddleware, updateSetting);

// Admin orders overview
router.get("/orders", authMiddleware, adminMiddleware, getAllOrders);
router.patch(
  "/orders/:orderId/complete",
  authMiddleware,
  adminMiddleware,
  markAsCompleted,
);

module.exports = router;
