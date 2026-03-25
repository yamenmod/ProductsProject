const db = require("../db/connection");

const normalizeProduct = (row) => ({
  _id: row.id,
  id: row.id,
  name: row.name,
  description: row.description,
  price: Number(row.price),
  stock: Number(row.stock),
  category_id: row.category_id,
  category: row.category || "",
  image: row.image_url || "",
  image_url: row.image_url || "",
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
    const { name, description, price, category, image, stock } = req.body;
    const uploadedImagePath = req.file ? `/uploads/${req.file.filename}` : null;

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
          image_url,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        name.trim(),
        description || "",
        Number(price),
        stock === undefined ? 0 : Number(stock),
        categoryId,
        uploadedImagePath || image || "",
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
    return res.status(500).json({ message: "Server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const [existingRows] = await db.query(
      "SELECT id, name, price, stock, category_id, description, image_url FROM products WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!existingRows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingProduct = existingRows[0];
    const { name, description, price, category, image, stock } = req.body;
    const uploadedImagePath = req.file ? `/uploads/${req.file.filename}` : null;

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
        uploadedImagePath ||
          (image !== undefined ? image : existingProduct.image_url),
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
    return res.status(500).json({ message: "Server error" });
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
