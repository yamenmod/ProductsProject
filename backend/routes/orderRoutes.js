const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getMyOrders,
  paySuccess,
  cancel,
} = require("../controllers/orderController");

const router = express.Router();

router.get("/my-orders", authMiddleware, getMyOrders);
router.post("/:id/pay-success", authMiddleware, paySuccess);
router.post("/:id/cancel", authMiddleware, cancel);

module.exports = router;
