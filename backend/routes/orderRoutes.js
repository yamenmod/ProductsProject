const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createPending,
  getMyOrders,
  paySuccess,
  cancel,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/create-pending", authMiddleware, createPending);
router.get("/my-orders", authMiddleware, getMyOrders);
router.post("/:id/pay-success", authMiddleware, paySuccess);
router.post("/:id/cancel", authMiddleware, cancel);

module.exports = router;
