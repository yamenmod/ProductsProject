const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { getCustomers } = require("../controllers/customerController");

const router = express.Router();

router.get("/customers", authMiddleware, adminMiddleware, getCustomers);

module.exports = router;