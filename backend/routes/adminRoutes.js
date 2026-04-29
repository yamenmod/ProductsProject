const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
<<<<<<< HEAD
const { getCustomers } = require("../controllers/customerController");

const router = express.Router();

router.get("/customers", authMiddleware, adminMiddleware, getCustomers);

module.exports = router;
=======
const { getAllUsers, deleteUser } = require("../controllers/adminController");

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, getAllUsers);
router.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);

module.exports = router;
>>>>>>> 9abd17a2b135d79ae7c5870af8a853e6eba0e9d1
