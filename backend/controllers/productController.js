const db = require("../db/connection");
const {
  calculateVatPricing,
  roundMoney,
  getVatRateFromDb,
} = require("../utils/pricing");

const PRODUCT_IMAGE_DIR = "/public/assets/img/products";

const isDataOrBlobUrl = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  return normalized.startsWith("data:") || normalized.startsWith("blob:");
};

const normalizeStoredImagePath = (value) => {
  if (!value) {
    return "";
  }

  let normalized = value.toString().trim();

  if (!normalized) {
    return "";
  }

  normalized = normalized.replace(/^['\"]+|['\"]+$/g, "");
  normalized = normalized.replace(/\\/g, "/");

  if (normalized.toLowerCase().startsWith("data:image/")) {
    return normalized;
  }

  if (isDataOrBlobUrl(normalized)) {
    return "";
  }

  const compactValue = normalized.replace(/\s+/g, "");

  if (compactValue.includes("base64,")) {
    return "";
  }

  if (/^[A-Za-z0-9+/=]+$/.test(compactValue) && compactValue.length > 120) {
    return "";
  }

  if (!compactValue.includes("/") && compactValue.length > 500) {
    return "";
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const parsed = new URL(normalized);
      normalized = parsed.pathname || normalized;
    } catch (error) {
      return normalized;
    }
  }

  if (normalized.startsWith("/public/") || normalized.startsWith("/uploads/")) {
    return normalized;
  }

  if (normalized.startsWith("public/") || normalized.startsWith("uploads/")) {
    return `/${normalized}`;
  }

  if (normalized.startsWith("assets/img/products/")) {
    return `/public/${normalized}`;
  }

  if (normalized.startsWith("/assets/img/products/")) {
    return `/public${normalized}`;
  }

  return `${PRODUCT_IMAGE_DIR}/${normalized.replace(/^\/+/, "")}`;
};

const parseLooseArrayString = (value) => {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    return [];
  }

  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    // Continue with loose parsing fallbacks.
  }

  try {
    const normalizedQuotes = trimmed.replace(/'/g, '"');
    const parsed = JSON.parse(normalizedQuotes);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    // Continue with comma split fallback.
  }

  return trimmed
    .slice(1, -1)
    .split(",")
    .map((part) => part.trim().replace(/^['\"]+|['\"]+$/g, ""))
    .filter(Boolean);
};

const parseStoredImages = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  if (trimmedValue.startsWith('"[') && trimmedValue.endsWith(']"')) {
    try {
      const unwrappedValue = JSON.parse(trimmedValue);
      const parsedValue = parseLooseArrayString(unwrappedValue);
      return parsedValue.length ? parsedValue : [unwrappedValue];
    } catch (error) {
      return [trimmedValue];
    }
  }

  if (trimmedValue.startsWith("[")) {
    const parsedValue = parseLooseArrayString(trimmedValue);

    if (parsedValue.length) {
      return parsedValue;
    }

    if (/^\[\s*\]$/.test(trimmedValue)) {
      return [];
    }

    {
      const dataUrlMatches = [...trimmedValue.matchAll(/"(data:[^"]+)"/g)].map(
        (match) => match[1],
      );

      if (dataUrlMatches.length) {
        return dataUrlMatches;
      }

      return [trimmedValue];
    }
  }

  return [trimmedValue];
};

const normalizeImageValue = (value) => {
  const safeValue = (value || "").toString().trim();

  if (!safeValue) {
    return "";
  }

  // Handle empty brackets [] or [""]
  if (safeValue === "[]" || safeValue === '[""]' || safeValue === "['']") {
    return "";
  }

  if (safeValue.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(safeValue);
      if (Array.isArray(parsedValue) && parsedValue.length) {
        return normalizeImageValue(parsedValue[0]);
      }
      // If array is empty, return empty
      if (Array.isArray(parsedValue) && !parsedValue.length) {
        return "";
      }
    } catch (error) {
      const dataUrlMatch = safeValue.match(/"(data:[^"]+)"/);
      if (dataUrlMatch?.[1]) {
        return dataUrlMatch[1];
      }
      // If JSON parse fails and it's just brackets, return empty
      if (safeValue === "[]" || safeValue.match(/^\[\s*\]$/)) {
        return "";
      }
    }
  }

  return normalizeStoredImagePath(safeValue);
};

const resolveImagePayload = (value) => {
  const images = parseStoredImages(value)
    .map(normalizeImageValue)
    .filter(Boolean);
  const uniqueImages = [...new Set(images)];
  return {
    imageUrls: uniqueImages,
    imageUrl: uniqueImages[0] || "",
  };
};

const normalizeGenderInput = (value) => {
  const normalized = (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "");

  if (
    normalized === "female" ||
    normalized === "women" ||
    normalized === "womens"
  ) {
    return "female";
  }

  if (normalized === "male" || normalized === "men" || normalized === "mens") {
    return "male";
  }

  if (normalized === "unisex") {
    return "unisex";
  }

  return "unisex";
};

const normalizeProduct = (row, vatRate = 0.18) => ({
  _id: row.id,
  id: row.id,
  name: row.name,
  description: row.description,
  price: roundMoney(row.price),
  ...calculateVatPricing(row.price, vatRate),
  stock: Number(row.stock),
  category_id: row.category_id,
  category: row.category || "",
  gender: normalizeGenderInput(row.gender),
  image: resolveImagePayload(row.image_url).imageUrl,
  image_url: resolveImagePayload(row.image_url).imageUrl,
  image_urls: resolveImagePayload(row.image_url).imageUrls,
  boardLength: row.board_length ? Number(row.board_length) : null,
  volume: row.volume ? Number(row.volume) : null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const resolveCategoryId = async (categoryName) => {
  const trimmedCategory = (categoryName || "").trim();
  if (!trimmedCategory) {
    return null;
  }

  const [existingCategories] = await db.query(
    "SELECT id FROM categories WHERE name = ? LIMIT 1",
    [trimmedCategory],
  );

  if (existingCategories.length) {
    return existingCategories[0].id;
  }

  const [insertResult] = await db.query(
    "INSERT INTO categories (name, description) VALUES (?, ?)",
    [trimmedCategory, ""],
  );

  return insertResult.insertId;
};

const getProducts = async (req, res) => {
  try {
    const vatRate = await getVatRateFromDb(db);

    const [products] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.board_length,
          p.volume,
          p.created_at,
          p.updated_at,
          c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.created_at DESC
      `,
    );

    const response = products.map((product) =>
      normalizeProduct(product, vatRate),
    );
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const getProductById = async (req, res) => {
  try {
    const vatRate = await getVatRateFromDb(db);

    const [products] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.board_length,
          p.volume,
          p.created_at,
          p.updated_at,
          c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [req.params.id],
    );

    if (!products.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(normalizeProduct(products[0], vatRate));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      gender,
      image,
      images,
      stock,
      boardLength,
      volume,
    } = req.body;
    const uploadedImagePaths = Array.isArray(req.files)
      ? req.files
          .filter(
            (file) =>
              file && file.mimetype && file.mimetype.startsWith("image/"),
          )
          .map((file) => `${PRODUCT_IMAGE_DIR}/${file.filename}`)
      : req.file
        ? [`${PRODUCT_IMAGE_DIR}/${req.file.filename}`]
        : [];

    const fallbackImages = parseStoredImages(images || image);
    const nextGender = normalizeGenderInput(gender);
    const nextImages = uploadedImagePaths.length
      ? uploadedImagePaths
      : fallbackImages;
    const storedImageValue =
      nextImages.length > 1 ? JSON.stringify(nextImages) : nextImages[0] || "";

    if (!name || price === undefined) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const categoryId = await resolveCategoryId(category);

    const [insertResult] = await db.query(
      `
        INSERT INTO products (
          name,
          description,
          price,
          stock,
          category_id,
          gender,
          image_url,
          board_length,
          volume,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        name.trim(),
        description || "",
        calculateVatPricing(price).basePrice,
        stock === undefined ? 0 : Number(stock),
        categoryId,
        nextGender,
        storedImageValue,
        boardLength === undefined ? null : Number(boardLength),
        volume === undefined ? null : Number(volume),
      ],
    );

    const [createdRows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.board_length,
          p.volume,
          p.created_at,
          p.updated_at,
          c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [insertResult.insertId],
    );

    return res
      .status(201)
      .json(normalizeProduct(createdRows[0], await getVatRateFromDb(db)));
  } catch (error) {
    console.error("Create product error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const [existingRows] = await db.query(
      "SELECT id, name, price, stock, category_id, description, gender, image_url, board_length, volume FROM products WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingProduct = existingRows[0];
    const {
      name,
      description,
      price,
      category,
      gender,
      image,
      images,
      stock,
      boardLength,
      volume,
    } = req.body;
    const uploadedImagePaths = Array.isArray(req.files)
      ? req.files
          .filter(
            (file) =>
              file && file.mimetype && file.mimetype.startsWith("image/"),
          )
          .map((file) => `${PRODUCT_IMAGE_DIR}/${file.filename}`)
      : req.file
        ? [`${PRODUCT_IMAGE_DIR}/${req.file.filename}`]
        : [];
    const hasImagesField = Object.prototype.hasOwnProperty.call(
      req.body,
      "images",
    );
    const fallbackImages = parseStoredImages(images || image);
    const existingImages = parseStoredImages(existingProduct.image_url);
    const keptImages = hasImagesField ? fallbackImages : existingImages;
    const nextGender =
      gender !== undefined
        ? normalizeGenderInput(gender)
        : normalizeGenderInput(existingProduct.gender);
    const nextImages = uploadedImagePaths.length
      ? [...keptImages, ...uploadedImagePaths]
      : keptImages;
    const storedImageValue =
      nextImages.length > 1 ? JSON.stringify(nextImages) : nextImages[0] || "";

    const nextName = name !== undefined ? name.trim() : existingProduct.name;
    const nextPrice =
      price !== undefined
        ? calculateVatPricing(price).basePrice
        : Number(existingProduct.price);

    if (!nextName || Number.isNaN(nextPrice)) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const nextCategoryId =
      category !== undefined
        ? await resolveCategoryId(category)
        : existingProduct.category_id;

    await db.query(
      `
        UPDATE products
        SET
          name = ?,
          description = ?,
          price = ?,
          stock = ?,
          category_id = ?,
          gender = ?,
          image_url = ?,
          board_length = ?,
          volume = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
      [
        nextName,
        description !== undefined ? description : existingProduct.description,
        nextPrice,
        stock !== undefined ? Number(stock) : Number(existingProduct.stock),
        nextCategoryId,
        nextGender,
        storedImageValue,
        boardLength !== undefined
          ? Number(boardLength)
          : existingProduct.board_length,
        volume !== undefined ? Number(volume) : existingProduct.volume,
        req.params.id,
      ],
    );

    const [updatedRows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.board_length,
          p.volume,
          p.created_at,
          p.updated_at,
          c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [req.params.id],
    );

    return res
      .status(200)
      .json(normalizeProduct(updatedRows[0], await getVatRateFromDb(db)));
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM products WHERE id = ?", [
      req.params.id,
    ]);

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Scans the products folder and assigns images to products based on product ID
const syncImages = async (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");

    // Path to products folder
    const productsImageDir = path.join(
      __dirname,
      "..",
      "..",
      "public",
      "assets",
      "img",
      "products",
    );

    // Check if directory exists
    if (!fs.existsSync(productsImageDir)) {
      return res
        .status(400)
        .json({ message: "Products image directory not found" });
    }

    // Read all files in the products folder
    const files = fs
      .readdirSync(productsImageDir)
      .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .sort();

    if (!files.length) {
      return res
        .status(400)
        .json({ message: "No images found in products folder" });
    }

    // Get all products
    const [products] = await db.query(
      "SELECT id FROM products ORDER BY id ASC",
    );

    if (!products.length) {
      return res.status(400).json({ message: "No products found" });
    }

    // Update each product with an image based on its ID
    let updatedCount = 0;
    for (const product of products) {
      // Use product ID to pick an image deterministically
      const imageIdx = (product.id - 1) % files.length;
      const imagePath = `${PRODUCT_IMAGE_DIR}/${files[imageIdx]}`;

      await db.query(
        "UPDATE products SET image_url = ?, updated_at = NOW() WHERE id = ?",
        [imagePath, product.id],
      );
      updatedCount++;
    }

    return res.status(200).json({
      message: "Images synced successfully",
      totalProducts: products.length,
      totalImages: files.length,
      updatedCount,
      imagesSample: files.slice(0, 5),
    });
  } catch (error) {
    console.error("Sync images error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const recommendBoards = async (req, res) => {
  try {
    const { weight, height, skillLevel } = req.body;

    if (!weight || !height || !skillLevel) {
      return res.status(400).json({
        message: "weight, height, and skillLevel are required",
      });
    }

    // Validate weight and height
    const weightNum = Number(weight);
    const heightNum = Number(height);

    if (Number.isNaN(weightNum) || Number.isNaN(heightNum)) {
      return res.status(400).json({
        message: "weight and height must be valid numbers",
      });
    }

    // Get all surfboards from database
    const [surfboards] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.board_length,
          p.volume,
          p.created_at,
          p.updated_at,
          c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE c.name = 'Surfboard' OR c.name = 'surfboard'
        ORDER BY p.volume ASC
      `,
    );

    if (!surfboards.length) {
      return res.status(200).json({
        recommendations: [],
        message: "No surfboards available",
      });
    }

    // Calculate recommended volume based on weight and skill level
    // Beginner: weight (kg) * 0.8 to 1.0
    // Intermediate: weight (kg) * 0.6 to 0.8
    // Advanced: weight (kg) * 0.35 to 0.5
    let volumeMultiplierMin, volumeMultiplierMax;

    if (skillLevel === "beginner" || skillLevel === "Beginner") {
      volumeMultiplierMin = 0.8;
      volumeMultiplierMax = 1.0;
    } else if (skillLevel === "intermediate" || skillLevel === "Intermediate") {
      volumeMultiplierMin = 0.6;
      volumeMultiplierMax = 0.8;
    } else if (skillLevel === "advanced" || skillLevel === "Advanced") {
      volumeMultiplierMin = 0.35;
      volumeMultiplierMax = 0.5;
    } else {
      volumeMultiplierMin = 0.6;
      volumeMultiplierMax = 0.8;
    }

    const targetVolumeMin = weightNum * volumeMultiplierMin;
    const targetVolumeMax = weightNum * volumeMultiplierMax;

    // Height also influences board length preferences
    // General rule: taller people generally want longer boards

    // Get VAT rate once
    const vatRate = await getVatRateFromDb(db);

    // Score each surfboard based on volume match
    const scoredBoards = surfboards
      .filter((board) => board.volume)
      .map((board) => {
        const volume = Number(board.volume);

        // Calculate volume score (closer to target range is better)
        // This is the primary (and only) factor for recommendations
        let volumeScore = 0;
        if (volume >= targetVolumeMin && volume <= targetVolumeMax) {
          volumeScore = 100;
        } else if (volume < targetVolumeMin) {
          const distanceBelow = targetVolumeMin - volume;
          volumeScore = Math.max(0, 100 - distanceBelow * 10);
        } else {
          const distanceAbove = volume - targetVolumeMax;
          volumeScore = Math.max(0, 100 - distanceAbove * 10);
        }

        return {
          ...normalizeProduct(board, vatRate),
          recommendationScore: Math.round(volumeScore),
          volumeScore: Math.round(volumeScore),
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore);

    const topRecommendations = scoredBoards.slice(0, 5);

    return res.status(200).json({
      recommendations: topRecommendations,
      userProfile: {
        weight: weightNum,
        height: heightNum,
        skillLevel,
        targetVolumeRange: {
          min: Math.round(targetVolumeMin * 10) / 10,
          max: Math.round(targetVolumeMax * 10) / 10,
        },
        targetLengthRange: {
          min: targetLengthMin,
          max: targetLengthMax,
        },
      },
    });
  } catch (error) {
    console.error("Board recommendation error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  syncImages,
  recommendBoards,
};
