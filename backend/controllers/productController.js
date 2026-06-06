const db = require("../db/connection");
const jwt = require("jsonwebtoken");
const {
  calculateVatPricing,
  roundMoney,
  getVatRateFromDb,
} = require("../utils/pricing");
const {
  getSizeStockTotal,
  parseSizeStockInput,
  serializeSizeStock,
  normalizeSizeStockMap,
} = require("../utils/sizeStock");

// Product catalogue, image normalization, and board recommendation logic.

const PRODUCT_IMAGE_DIR = "/public/assets/img/products";

const isDataOrBlobUrl = (value) => {
  // Detect values that are not safe to store as image paths.
  const normalized = (value || "").toString().trim().toLowerCase();
  return normalized.startsWith("data:") || normalized.startsWith("blob:");
};

const normalizeStoredImagePath = (value) => {
  // Convert a saved image string into the path format used by the app.
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
  // Extract image paths from legacy array-like strings.
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
  // Normalize the raw database field into an array of image strings.
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
  // Reduce each stored value to a single usable image path.
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
  // Return both the full list and the primary image for previews.
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
  // Map user-entered gender text to the canonical values used by filters.
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

const isClothingCategory = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  return normalized.includes("clothing") || normalized.includes("wetsuit");
};

const normalizeProduct = (row, vatRate = 0) => {
  const normalizedBoardHeight =
    row.board_height !== undefined && row.board_height !== null
      ? Number(row.board_height)
      : row.height !== undefined && row.height !== null
        ? Number(row.height)
        : null;

  const normalizedBoardVolume =
    row.board_volume !== undefined && row.board_volume !== null
      ? Number(row.board_volume)
      : row.volume !== undefined && row.volume !== null
        ? Number(row.volume)
        : null;

  const normalizedSizeStock = normalizeSizeStockMap(row.size_stock);
  const normalizedStock = normalizedSizeStock
    ? getSizeStockTotal(normalizedSizeStock)
    : Number(row.stock);

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description,
    price: roundMoney(row.price),
    ...calculateVatPricing(row.price, vatRate),
    stock: normalizedStock,
    max_quantity_per_user: Number(row.max_quantity_per_user || 10),
    category_id: row.category_id,
    category: row.category || "",
    gender: normalizeGenderInput(row.gender),
    size: row.size || "",
    sizeStock: normalizedSizeStock,
    size_stock: normalizedSizeStock,
    image: resolveImagePayload(row.image_url).imageUrl,
    image_url: resolveImagePayload(row.image_url).imageUrl,
    image_urls: resolveImagePayload(row.image_url).imageUrls,
    boardHeight: normalizedBoardHeight,
    boardVolume: normalizedBoardVolume,
    height: row.height ? Number(row.height) : null,
    volume: row.volume ? Number(row.volume) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

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
  // List products, optionally filtered by category and search text.
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
          p.max_quantity_per_user,
          p.size_stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.size,
          p.board_length,
          p.board_height,
          p.height,
          p.board_volume,
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
    console.error("getProducts error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const getProductById = async (req, res) => {
  // Load one product and return the normalized image payload.
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
          p.max_quantity_per_user,
          p.size_stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.size,
          p.board_length,
          p.board_height,
          p.height,
          p.board_volume,
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
  // Create a new product record and save any uploaded images.
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
      maxQuantityPerUser,
      sizeStock,
      boardLength,
      height,
      boardHeight,
      volume,
      boardVolume,
      size,
    } = req.body;
    const nextBoardHeight =
      boardHeight !== undefined
        ? boardHeight
        : height !== undefined
          ? height
          : null;
    const nextBoardVolume =
      boardVolume !== undefined
        ? boardVolume
        : volume !== undefined
          ? volume
          : null;
    const nextSize = isClothingCategory(category) ? size || null : null;
    const nextSizeStock = isClothingCategory(category)
      ? parseSizeStockInput(sizeStock)
      : null;
    const nextStock = isClothingCategory(category)
      ? getSizeStockTotal(nextSizeStock)
      : stock === undefined
        ? 0
        : Number(stock);
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
          size,
          size_stock,
          board_length,
          board_height,
          height,
          board_volume,
          volume,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        name.trim(),
        description || "",
        calculateVatPricing(price).basePrice,
        nextStock,
        categoryId,
        nextGender,
        storedImageValue,
        nextSize,
        serializeSizeStock(nextSizeStock),
        boardLength === undefined ? null : Number(boardLength),
        nextBoardHeight === undefined || nextBoardHeight === null
          ? null
          : Number(nextBoardHeight),
        nextBoardHeight === undefined || nextBoardHeight === null
          ? null
          : Number(nextBoardHeight),
        nextBoardVolume === undefined || nextBoardVolume === null
          ? null
          : Number(nextBoardVolume),
        nextBoardVolume === undefined || nextBoardVolume === null
          ? null
          : Number(nextBoardVolume),
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
          p.max_quantity_per_user,
          p.size_stock,
          p.category_id,
          p.gender,
          p.image_url,
          p.size,
          p.size_stock,
          p.board_length,
          p.board_height,
          p.height,
          p.board_volume,
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
  // Update an existing product and refresh its stored images.
  try {
    const [existingRows] = await db.query(
      "SELECT p.id, p.name, p.price, p.stock, p.max_quantity_per_user, p.category_id, p.description, p.gender, p.image_url, p.size, p.board_length, p.board_height, p.height, p.board_volume, p.volume, c.name AS category FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ? LIMIT 1",
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
      maxQuantityPerUser,
      boardLength,
      height,
      boardHeight,
      volume,
      boardVolume,
      size,
      sizeStock,
    } = req.body;
    const nextBoardHeight =
      boardHeight !== undefined
        ? boardHeight
        : height !== undefined
          ? height
          : null;
    const nextBoardVolume =
      boardVolume !== undefined
        ? boardVolume
        : volume !== undefined
          ? volume
          : null;
    const nextSize =
      category !== undefined
        ? isClothingCategory(category)
          ? size || null
          : null
        : isClothingCategory(existingProduct.category)
          ? size !== undefined
            ? size || null
            : existingProduct.size || null
          : null;
    const nextSizeStock =
      category !== undefined
        ? isClothingCategory(category)
          ? sizeStock !== undefined
            ? parseSizeStockInput(sizeStock)
            : normalizeSizeStockMap(existingProduct.size_stock)
          : null
        : isClothingCategory(existingProduct.category)
          ? sizeStock !== undefined
            ? parseSizeStockInput(sizeStock)
            : normalizeSizeStockMap(existingProduct.size_stock)
          : null;
    const nextStock = isClothingCategory(
      category !== undefined ? category : existingProduct.category,
    )
      ? getSizeStockTotal(nextSizeStock)
      : stock !== undefined
        ? Number(stock)
        : Number(existingProduct.stock);
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
          max_quantity_per_user = ?,
          category_id = ?,
          gender = ?,
          image_url = ?,
          size = ?,
          size_stock = ?,
          board_length = ?,
          board_height = ?,
          height = ?,
          board_volume = ?,
          volume = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
      [
        nextName,
        description !== undefined ? description : existingProduct.description,
        nextPrice,
        nextStock,
        maxQuantityPerUser !== undefined ? Number(maxQuantityPerUser) : (existingProduct.max_quantity_per_user || 10),
        nextCategoryId,
        nextGender,
        storedImageValue,
        nextSize,
        serializeSizeStock(nextSizeStock),
        boardLength !== undefined
          ? Number(boardLength)
          : existingProduct.board_length,
        nextBoardHeight !== undefined && nextBoardHeight !== null
          ? Number(nextBoardHeight)
          : existingProduct.height,
        nextBoardHeight !== undefined && nextBoardHeight !== null
          ? Number(nextBoardHeight)
          : existingProduct.height,
        nextBoardVolume !== undefined && nextBoardVolume !== null
          ? Number(nextBoardVolume)
          : existingProduct.volume,
        nextBoardVolume !== undefined && nextBoardVolume !== null
          ? Number(nextBoardVolume)
          : existingProduct.volume,
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
          p.max_quantity_per_user,
          p.category_id,
          p.gender,
          p.image_url,
          p.size,
          p.size_stock,
          p.board_length,
          p.board_height,
          p.height,
          p.board_volume,
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
  // Delete a product from the catalogue.
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
  // Reconcile uploaded images with the stored product rows.
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
  // Recommend surfboards based on the user's measurements and preferences.
  try {
    const { weight, height, skillLevel } = req.body;
    let resolvedWeight = weight;
    let resolvedHeight = height;

    const hasMissingMeasurements =
      resolvedWeight === undefined ||
      resolvedWeight === null ||
      resolvedWeight === "" ||
      resolvedHeight === undefined ||
      resolvedHeight === null ||
      resolvedHeight === "";

    if (hasMissingMeasurements) {
      const authorizationHeader = req.headers.authorization || "";

      if (authorizationHeader.startsWith("Bearer ")) {
        try {
          const token = authorizationHeader.split(" ")[1];
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "secret123",
          );

          const [users] = await db.query(
            "SELECT weight, height FROM users WHERE id = ? LIMIT 1",
            [decoded.id],
          );

          const profile = users[0];

          if (
            (resolvedWeight === undefined ||
              resolvedWeight === null ||
              resolvedWeight === "") &&
            profile?.weight !== undefined &&
            profile?.weight !== null
          ) {
            resolvedWeight = profile.weight;
          }

          if (
            (resolvedHeight === undefined ||
              resolvedHeight === null ||
              resolvedHeight === "") &&
            profile?.height !== undefined &&
            profile?.height !== null
          ) {
            resolvedHeight = profile.height;
          }
        } catch (tokenError) {
          // Continue with the request body if the token is missing or invalid.
        }
      }
    }

    if (!resolvedWeight || !resolvedHeight || !skillLevel) {
      return res.status(400).json({
        message: "weight, height, and skillLevel are required",
      });
    }

    // Validate weight and height
    const weightNum = Number(resolvedWeight);
    const heightNum = Number(resolvedHeight);

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
          p.size,
          p.board_length,
          p.board_height,
          p.height,
          p.board_volume,
          p.volume,
          p.created_at,
          p.updated_at,
          c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE LOWER(c.name) LIKE '%surfboard%'
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

    const boardHeightRatio =
      skillLevel === "beginner" || skillLevel === "Beginner"
        ? 0.1
        : skillLevel === "advanced" || skillLevel === "Advanced"
          ? 0.09
          : 0.095;
    const boardHeightTolerance =
      skillLevel === "beginner" || skillLevel === "Beginner"
        ? 3.5
        : skillLevel === "advanced" || skillLevel === "Advanced"
          ? 2.0
          : 2.7;

    const targetBoardHeight = Math.max(0, heightNum * boardHeightRatio);
    const targetBoardHeightMin = Math.max(
      0,
      targetBoardHeight - boardHeightTolerance,
    );
    const targetBoardHeightMax = targetBoardHeight + boardHeightTolerance;

    // Height also influences board length preferences
    const surferHeightFt = heightNum / 30.48;
    const baseLengthFt = surferHeightFt + 0.5;
    let lengthOffsetMin = 0.2;
    let lengthOffsetMax = 0.7;

    if (skillLevel === "beginner" || skillLevel === "Beginner") {
      lengthOffsetMin = 0.4;
      lengthOffsetMax = 1.0;
    } else if (skillLevel === "intermediate" || skillLevel === "Intermediate") {
      lengthOffsetMin = 0.3;
      lengthOffsetMax = 0.8;
    } else if (skillLevel === "advanced" || skillLevel === "Advanced") {
      lengthOffsetMin = 0.1;
      lengthOffsetMax = 0.5;
    }

    const targetLengthMin = Math.max(5.0, baseLengthFt + lengthOffsetMin);
    const targetLengthMax = Math.min(12.0, baseLengthFt + lengthOffsetMax);
    const targetLengthCenter = (targetLengthMin + targetLengthMax) / 2;
    const targetVolumeCenter = (targetVolumeMin + targetVolumeMax) / 2;
    const targetHeightCenter =
      (targetBoardHeightMin + targetBoardHeightMax) / 2;

    const scoreMetric = (value, target) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return 0;
      }

      const diff = Math.abs(value - target);
      if (diff === 0) {
        return 100;
      }

      const normalized = Math.max(0, 100 - (diff / Math.max(target, 1)) * 100);
      return Math.round(Math.min(100, normalized));
    };

    // Get VAT rate once
    const vatRate = await getVatRateFromDb(db);

    // Score each surfboard based on volume, board feet, and board length matches
    const scoredBoards = surfboards
      .map((board) => {
        const normalizedHeight =
          board.board_height !== undefined && board.board_height !== null
            ? Number(board.board_height)
            : board.height !== undefined && board.height !== null
              ? Number(board.height)
              : null;
        const normalizedVolume =
          board.board_volume !== undefined && board.board_volume !== null
            ? Number(board.board_volume)
            : board.volume !== undefined && board.volume !== null
              ? Number(board.volume)
              : null;
        const volume = normalizedVolume;
        const boardHeight = normalizedHeight;
        const boardLength = Number(board.board_length);

        const volumeScore = scoreMetric(volume, targetVolumeCenter);
        const heightScore = scoreMetric(boardHeight, targetHeightCenter);
        const lengthScore = scoreMetric(boardLength, targetLengthCenter);

        const recommendationScore = Math.round(
          volumeScore * 0.5 + heightScore * 0.4 + lengthScore * 0.1,
        );

        return {
          ...normalizeProduct(board, vatRate),
          recommendationScore,
          volumeScore,
          boardHeightScore: heightScore,
          boardLengthScore: lengthScore,
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
