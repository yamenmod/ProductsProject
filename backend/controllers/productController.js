const db = require("../db/connection");

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
      const parsedValue = JSON.parse(unwrappedValue);
      return Array.isArray(parsedValue)
        ? parsedValue.filter(Boolean)
        : [unwrappedValue];
    } catch (error) {
      return [trimmedValue];
    }
  }

  if (trimmedValue.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(trimmedValue);
      return Array.isArray(parsedValue)
        ? parsedValue.filter(Boolean)
        : [trimmedValue];
    } catch (error) {
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
  if (!value) {
    return "";
  }

  if (value.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(value);
      if (Array.isArray(parsedValue) && parsedValue.length) {
        return normalizeImageValue(parsedValue[0]);
      }
    } catch (error) {
      const dataUrlMatch = value.match(/"(data:[^"]+)"/);
      if (dataUrlMatch?.[1]) {
        return dataUrlMatch[1];
      }
    }
  }

  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/uploads/")) {
    return value;
  }

  return `/uploads/${value.replace(/^\/+/, "")}`;
};

const resolveImagePayload = (value) => {
  const images = parseStoredImages(value).map(normalizeImageValue);
  return {
    imageUrls: images,
    imageUrl: images[0] || "",
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

const normalizeProduct = (row) => ({
  _id: row.id,
  id: row.id,
  name: row.name,
  description: row.description,
  price: Number(row.price),
  stock: Number(row.stock),
  category_id: row.category_id,
  category: row.category || "",
  gender: normalizeGenderInput(row.gender),
  image: resolveImagePayload(row.image_url).imageUrl,
  image_url: resolveImagePayload(row.image_url).imageUrl,
  image_urls: resolveImagePayload(row.image_url).imageUrls,
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
          p.created_at,
          p.updated_at,
          c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.created_at DESC
      `,
    );

    const response = products.map(normalizeProduct);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const getProductById = async (req, res) => {
  try {
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

    return res.status(200).json(normalizeProduct(products[0]));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, gender, image, images, stock } =
      req.body;
    const uploadedImagePaths = Array.isArray(req.files)
      ? req.files
          .filter(
            (file) =>
              file && file.mimetype && file.mimetype.startsWith("image/"),
          )
          .map((file) => file.filename)
      : req.file
        ? [req.file.filename]
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
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        name.trim(),
        description || "",
        Number(price),
        stock === undefined ? 0 : Number(stock),
        categoryId,
        nextGender,
        storedImageValue,
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

    return res.status(201).json(normalizeProduct(createdRows[0]));
  } catch (error) {
    console.error("Create product error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const [existingRows] = await db.query(
      "SELECT id, name, price, stock, category_id, description, gender, image_url FROM products WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingProduct = existingRows[0];
    const { name, description, price, category, gender, image, images, stock } =
      req.body;
    const uploadedImagePaths = Array.isArray(req.files)
      ? req.files
          .filter(
            (file) =>
              file && file.mimetype && file.mimetype.startsWith("image/"),
          )
          .map((file) => file.filename)
      : req.file
        ? [req.file.filename]
        : [];
    const fallbackImages = parseStoredImages(images || image);
    const existingImages = parseStoredImages(existingProduct.image_url);
    const nextGender =
      gender !== undefined
        ? normalizeGenderInput(gender)
        : normalizeGenderInput(existingProduct.gender);
    const nextImages = uploadedImagePaths.length
      ? [...existingImages, ...uploadedImagePaths]
      : fallbackImages.length
        ? fallbackImages
        : existingImages;
    const storedImageValue =
      nextImages.length > 1 ? JSON.stringify(nextImages) : nextImages[0] || "";

    const nextName = name !== undefined ? name.trim() : existingProduct.name;
    const nextPrice =
      price !== undefined ? Number(price) : Number(existingProduct.price);

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

    return res.status(200).json(normalizeProduct(updatedRows[0]));
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

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
