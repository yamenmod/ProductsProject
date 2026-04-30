const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { getCustomers, deleteCustomer } = require("../controllers/customerController");
const { getSetting, getAllSettings, updateSetting } = require("../controllers/settingsController");

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, getCustomers);
router.delete("/users/:userId", authMiddleware, adminMiddleware, deleteCustomer);
router.get("/customers", authMiddleware, adminMiddleware, getCustomers);
router.delete("/customers/:userId", authMiddleware, adminMiddleware, deleteCustomer);

// Settings endpoints (admin only)
router.get("/settings", authMiddleware, adminMiddleware, getAllSettings);
router.get("/settings/:key", authMiddleware, adminMiddleware, getSetting);
router.put("/settings/:key", authMiddleware, adminMiddleware, updateSetting);

// Public endpoint to get current VAT rate (no auth required)
router.get("/vat-rate", getSetting);

module.exports = router;