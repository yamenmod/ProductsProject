const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  syncImages,
  recommendBoards,
} = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/sync-images", syncImages);
router.post("/recommend-boards", recommendBoards);
router.post("/", authMiddleware, adminMiddleware, upload.any(), createProduct);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  upload.any(),
  updateProduct,
);
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

module.exports = router;
