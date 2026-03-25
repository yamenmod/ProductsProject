const express = require("express");
const {
  getCart,
  addToCart,
  removeFromCart,
  checkout,
} = require("../controllers/cartController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getCart);
router.post("/", authMiddleware, addToCart);
router.delete("/:productId", authMiddleware, removeFromCart);
router.post("/checkout", authMiddleware, checkout);

module.exports = router;
