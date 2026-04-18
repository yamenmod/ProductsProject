const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "assets",
  "img",
  "products",
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file?.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }

    return cb(null, true);
  },
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 8,
    fieldSize: 2 * 1024 * 1024,
    fields: 50,
  },
});

module.exports = upload;
