const axios = require("axios");
const db = require("../db/connection");
const { sendInvoiceEmail } = require("../utils/sendInvoiceEmail");
const {
  getAvailableStock,
  getSizeStockTotal,
  normalizeSizeStockMap,
  serializeSizeStock,
} = require("../utils/sizeStock");
const {
  calculateVatPricing,
  roundMoney,
  getVatRateFromDb,
} = require("../utils/pricing");

// Cart, checkout, payment, and admin order reporting endpoints.

const PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID || "").trim();
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET || "").trim();
const PAYPAL_BASE_URL = (
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"
).trim();
const PAYPAL_CURRENCY = (process.env.PAYPAL_CURRENCY || "USD").trim();
const BACKEND_BASE_URL = (
  process.env.BACKEND_BASE_URL || "http://localhost:5000"
).trim();
const FRONTEND_BASE_URL = (
  process.env.FRONTEND_BASE_URL || "http://localhost:3000"
).trim();

const ORDER_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  UNSUCCESSFUL: "unsuccessful",
};

const normalizeOrderStatusFromCapture = (captureStatus) => {
  return String(captureStatus || "").toUpperCase() === "COMPLETED"
    ? ORDER_STATUS.SUCCESS
    : ORDER_STATUS.UNSUCCESSFUL;
};

const isPayerNotApprovedError = (error) => {
  const description = String(
    error?.response?.data?.details?.[0]?.description ||
      error?.response?.data?.message ||
      error?.message ||
      "",
  ).toLowerCase();

  return description.includes(
    "payer has not yet approved the order for payment",
  );
};

const logPayPalFlow = (step, details = {}) => {
  console.log(`[paypal:flow] ${step}`, details);
};

const getPayPalAccessToken = async () => {
  // Exchange PayPal client credentials for a short-lived access token.
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are not configured");
  }

  const encoded = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
    "utf8",
  ).toString("base64");

  const response = await axios.post(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!response.data || !response.data.access_token) {
    throw new Error("Unable to retrieve PayPal access token");
  }

  return response.data.access_token;
};

const calculateCartTotal = async (userId) => {
  // Load the current cart and calculate the VAT-inclusive total.
  const [cartRows] = await db.query(
    `
      SELECT p.id, p.name, p.price, p.stock, p.size_stock, c.name AS category, ci.size, ci.quantity
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ci.user_id = ?
    `,
    [userId],
  );

  if (!cartRows.length) {
    return {
      total: 0,
      items: [],
    };
  }

  let total = 0;
  const items = cartRows.map((item) => {
    const pricing = calculateVatPricing(item.price);
    const itemTotal = roundMoney(pricing.finalPrice * Number(item.quantity));
    total = roundMoney(total + itemTotal);

    return {
      ...item,
      displayName: item.size ? `${item.name} (Size ${item.size})` : item.name,
      pricing,
      itemTotal,
    };
  });

  return { total, items };
};

const resolvePrimaryImage = (value) => {
  // Normalize stored image data into a single usable image path.
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.find(Boolean) || "";
  }

  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  // Handle empty brackets [] or [""]
  if (
    trimmedValue === "[]" ||
    trimmedValue === '[""]' ||
    trimmedValue === "['']"
  ) {
    return "";
  }

  if (trimmedValue.startsWith("[")) {
    try {
      const parsedValue = JSON.parse(trimmedValue);
      const imageValue = Array.isArray(parsedValue)
        ? parsedValue.find(Boolean) || ""
        : trimmedValue;

      if (!imageValue) {
        return "";
      }

      if (
        imageValue.startsWith("http://") ||
        imageValue.startsWith("https://")
      ) {
        return imageValue;
      }

      if (imageValue.startsWith("/uploads/")) {
        return imageValue;
      }

      return `/uploads/${imageValue.replace(/^\/+/, "")}`;
    } catch (error) {
      // If JSON parse fails and it's just brackets, return empty
      if (trimmedValue === "[]" || trimmedValue.match(/^\[\s*\]$/)) {
        return "";
      }
      return trimmedValue;
    }
  }

  if (trimmedValue.startsWith("data:") || trimmedValue.startsWith("blob:")) {
    return trimmedValue;
  }

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://")
  ) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/uploads/")) {
    return trimmedValue;
  }

  return `/uploads/${trimmedValue.replace(/^\/+/, "")}`;
};

// quickCheckout allows purchasing a single product immediately without
// mutating the user's cart. It mirrors the checkout logic but for one
// specified product and quantity in the request body.
// Purchases one product immediately without adding it to the cart.
const quickCheckout = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;
    const normalizedSize = (size || "").toString().trim().toUpperCase();

    const [products] = await db.query(
      `SELECT p.id, p.name, p.price, p.stock, p.size_stock, c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? LIMIT 1`,
      [productId],
    );

    if (!products.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = products[0];
    const isWetsuit = (product.category || "")
      .toString()
      .trim()
      .toLowerCase()
      .includes("wetsuit");

    if (isWetsuit && !normalizedSize) {
      return res.status(400).json({ message: "Size is required for wetsuits" });
    }

    if (getAvailableStock(product, normalizedSize) < qty) {
      return res
        .status(400)
        .json({ message: `Not enough stock for ${product.name}` });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const currentSizeStock = normalizeSizeStockMap(product.size_stock);

      if (isWetsuit && currentSizeStock) {
        const nextSizeStock = {
          ...currentSizeStock,
        };
        nextSizeStock[normalizedSize] =
          Number(nextSizeStock[normalizedSize] || 0) - qty;

        await connection.query(
          "UPDATE products SET stock = ?, size_stock = ?, updated_at = NOW() WHERE id = ?",
          [
            getSizeStockTotal(nextSizeStock),
            serializeSizeStock(nextSizeStock),
            productId,
          ],
        );
      } else {
        await connection.query(
          "UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?",
          [qty, productId],
        );
      }

      const pricing = calculateVatPricing(product.price);
      const subtotal = roundMoney(pricing.finalPrice * qty);
      const total = roundMoney(subtotal);

      const [orderResult] = await connection.query(
        "INSERT INTO orders (user_id, total, status, created_at) VALUES (?, ?, 'paid', NOW())",
        [req.user.id, total],
      );

      await connection.query(
        "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
        [
          orderResult.insertId,
          productId,
          product.name,
          pricing.finalPrice,
          qty,
        ],
      );

      await connection.commit();
      connection.release();

      return res.status(200).json({
        message: "Purchase completed successfully",
        order: {
          id: orderResult.insertId,
          items: [
            {
              product: productId,
              name: product.name,
              basePrice: pricing.basePrice,
              vatAmount: pricing.vatAmount,
              finalPrice: pricing.finalPrice,
              quantity: qty,
              subtotal,
            },
          ],
          total,
          status: "paid",
        },
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      return res.status(500).json({ message: "Server error" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Converts raw cart rows into the shape the frontend already expects.
// This keeps the API response consistent across cart actions.
const mapCartRows = (rows, vatRate = 0) =>
  rows.map((row) => ({
    product: {
      _id: row.id,
      id: row.id,
      name: row.name,
      price: roundMoney(row.price),
      ...calculateVatPricing(row.price, vatRate),
      stock: Number(row.stock),
      category: row.category || "",
      size: row.size || "",
      image: resolvePrimaryImage(row.image_url),
    },
    quantity: Number(row.quantity),
    size: row.size || "",
  }));

// Reads the signed-in user's cart and returns the current items and totals.
// The query joins products and categories so the frontend can render details.
// Returns the logged-in user's cart contents.
const getCart = async (req, res) => {
  try {
    const vatRate = await getVatRateFromDb(db);

    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.name AS category,
          ci.size,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
        ORDER BY ci.id DESC
      `,
      [req.user.id],
    );

    return res.status(200).json(mapCartRows(rows, vatRate));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Adds or updates a cart item for the current user.
// It validates the product first, then returns the refreshed cart state.
// Adds an item to the cart or increments its quantity.
const addToCart = async (req, res) => {
  try {
    const vatRate = await getVatRateFromDb(db);
    const { productId, quantity, size } = req.body;
    const sourcePage = req.headers["x-source-page"] || "unknown";

    console.log(
      `[cart:add] source=${sourcePage} user=${req.user?.id} product=${productId} qty=${quantity}`,
    );

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    const [products] = await db.query(
      `
        SELECT p.id, c.name AS category
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
        LIMIT 1
      `,
      [productId],
    );
    if (!products.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const normalizedSize = (size || "").toString().trim().toUpperCase();
    const isWetsuit = (products[0].category || "")
      .toString()
      .trim()
      .toLowerCase()
      .includes("wetsuit");

    if (isWetsuit && !normalizedSize) {
      return res.status(400).json({ message: "Size is required for wetsuits" });
    }

    const [users] = await db.query(
      "SELECT id, email FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );
    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [existingItems] = await db.query(
      "SELECT id FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ? LIMIT 1",
      [req.user.id, productId, isWetsuit ? normalizedSize : ""],
    );

    if (existingItems.length) {
      await db.query(
        "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
        [qty, existingItems[0].id],
      );
      console.log(
        `[cart:add] updated existing item id=${existingItems[0].id} user=${req.user.id}`,
      );
    } else {
      await db.query(
        "INSERT INTO cart_items (user_id, product_id, size, quantity) VALUES (?, ?, ?, ?)",
        [req.user.id, productId, isWetsuit ? normalizedSize : "", qty],
      );
      console.log(
        `[cart:add] inserted new item user=${req.user.id} product=${productId}`,
      );
    }

    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.name AS category,
          ci.size,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
        ORDER BY ci.id DESC
      `,
      [req.user.id],
    );

    return res.status(200).json(mapCartRows(rows, vatRate));
  } catch (error) {
    console.error(`[cart:add] error: ${error.message}`);
    return res.status(500).json({ message: "Server error" });
  }
};

// Removes one product from the current user's cart.
// The response again returns the updated cart so the UI stays in sync.
// Removes a cart item for the current user.
const removeFromCart = async (req, res) => {
  try {
    const vatRate = await getVatRateFromDb(db);
    const { productId } = req.params;
    const normalizedSize = (req.query.size || "")
      .toString()
      .trim()
      .toUpperCase();

    await db.query(
      normalizedSize
        ? "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?"
        : "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
      normalizedSize
        ? [req.user.id, productId, normalizedSize]
        : [req.user.id, productId],
    );

    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.name AS category,
          ci.size,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
        ORDER BY ci.id DESC
      `,
      [req.user.id],
    );

    return res.status(200).json(mapCartRows(rows, vatRate));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Changes the quantity of an item already in the cart.
const updateCartQuantity = async (req, res) => {
  try {
    const vatRate = await getVatRateFromDb(db);
    const { productId } = req.params;
    const { quantity } = req.body;
    const normalizedSize = (req.query.size || req.body.size || "")
      .toString()
      .trim()
      .toUpperCase();
    const nextQuantity = Number(quantity);

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (!Number.isFinite(nextQuantity)) {
      return res.status(400).json({ message: "Quantity must be a number" });
    }

    if (nextQuantity <= 0) {
      await db.query(
        normalizedSize
          ? "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?"
          : "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
        normalizedSize
          ? [req.user.id, productId, normalizedSize]
          : [req.user.id, productId],
      );
    } else {
      const [products] = await db.query(
        `SELECT p.stock, p.size_stock, c.name AS category
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.id = ? LIMIT 1`,
        [productId],
      );

      if (!products.length) {
        return res.status(404).json({ message: "Product not found" });
      }

      const product = products[0];
      const isWetsuit = (product.category || "")
        .toString()
        .trim()
        .toLowerCase()
        .includes("wetsuit");

      if (isWetsuit && !normalizedSize) {
        return res
          .status(400)
          .json({ message: "Size is required for wetsuits" });
      }

      const stock = getAvailableStock(product, normalizedSize);
      if (nextQuantity > stock) {
        return res.status(400).json({
          message: `Only ${stock} item${stock === 1 ? "" : "s"} available in stock`,
        });
      }

      const [existingItems] = await db.query(
        "SELECT id FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ? LIMIT 1",
        [req.user.id, productId, normalizedSize],
      );

      if (!existingItems.length) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      await db.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [
        nextQuantity,
        existingItems[0].id,
      ]);
    }

    const [rows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.image_url,
          c.name AS category,
          ci.size,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
        ORDER BY ci.id DESC
      `,
      [req.user.id],
    );

    return res.status(200).json(mapCartRows(rows, vatRate));
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Converts the user's cart into a paid order and clears the cart afterward.
// This is the checkout flow that creates the order records seen by admin.
// Finalizes the cart into an order and sends the receipt email.
const checkout = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, email FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const [cartRows] = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.price,
          p.stock,
          p.size_stock,
          c.name AS category,
          ci.size,
          ci.quantity
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ci.user_id = ?
      `,
      [req.user.id],
    );

    if (!cartRows.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total = 0;
    const items = [];

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (const item of cartRows) {
        if (getAvailableStock(item, item.size) < Number(item.quantity)) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: `Not enough stock for ${item.name}`,
          });
        }

        const currentSizeStock = normalizeSizeStockMap(item.size_stock);

        if (currentSizeStock && item.size) {
          const nextSizeStock = { ...currentSizeStock };
          nextSizeStock[item.size] =
            Number(nextSizeStock[item.size] || 0) - Number(item.quantity);

          await connection.query(
            "UPDATE products SET stock = ?, size_stock = ?, updated_at = NOW() WHERE id = ?",
            [
              getSizeStockTotal(nextSizeStock),
              serializeSizeStock(nextSizeStock),
              item.id,
            ],
          );
        } else {
          await connection.query(
            "UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?",
            [Number(item.quantity), item.id],
          );
        }

        const pricing = calculateVatPricing(item.price);
        const subtotal = roundMoney(pricing.finalPrice * Number(item.quantity));
        total = roundMoney(total + subtotal);

        items.push({
          product: item.id,
          name: item.name,
          displayName: item.size
            ? `${item.name} (Size ${item.size})`
            : item.name,
          basePrice: pricing.basePrice,
          vatAmount: pricing.vatAmount,
          finalPrice: pricing.finalPrice,
          quantity: Number(item.quantity),
          subtotal,
        });
      }

      const [orderResult] = await connection.query(
        "INSERT INTO orders (user_id, total, customer_email, status, created_at) VALUES (?, ?, ?, 'paid', NOW())",
        [req.user.id, total, users[0]?.email || null],
      );

      for (const item of items) {
        await connection.query(
          "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
          [
            orderResult.insertId,
            item.product,
            item.displayName || item.name,
            item.finalPrice,
            item.quantity,
          ],
        );
      }

      await connection.query("DELETE FROM cart_items WHERE user_id = ?", [
        req.user.id,
      ]);
      await connection.commit();
      connection.release();

      return res.status(200).json({
        message: "Purchase completed successfully",
        order: {
          id: orderResult.insertId,
          items,
          total: roundMoney(total),
          status: "paid",
        },
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      return res.status(500).json({ message: "Server error" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Returns every order for the admin dashboard.
// The admin page uses this list to show customer, amount, and payment status.
// Exposes the PayPal config needed by the frontend checkout flow.
const createPaypalConfig = async (req, res) => {
  try {
    if (!PAYPAL_CLIENT_ID) {
      return res.status(500).json({
        message: "PayPal client ID is not configured",
      });
    }

    return res.status(200).json({
      clientId: PAYPAL_CLIENT_ID,
      currency: PAYPAL_CURRENCY,
      environment: "sandbox",
      baseUrl: PAYPAL_BASE_URL,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Starts a PayPal order using the current cart total.
const createPaypalOrder = async (req, res) => {
  try {
    logPayPalFlow("checkout-start", {
      userId: req.user?.id || null,
    });

    const [users] = await db.query(
      "SELECT id, username, email FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const { total, items } = await calculateCartTotal(req.user.id);

    if (!items.length || total <= 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: PAYPAL_CURRENCY,
              value: total.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: `${BACKEND_BASE_URL}/api/cart/paypal/success`,
          cancel_url: `${BACKEND_BASE_URL}/api/cart/paypal/cancel`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.data || !response.data.id) {
      return res.status(500).json({ message: "PayPal order creation error" });
    }

    const userRecord = users[0];
    const paypalOrderId = response.data.id;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.query(
        "INSERT INTO orders (user_id, total, customer_email, status, created_at) VALUES (?, ?, ?, ?, NOW())",
        [req.user.id, total, userRecord?.email || null, ORDER_STATUS.PENDING],
      );

      for (const item of items) {
        await connection.query(
          "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
          [
            orderResult.insertId,
            item.id,
            item.displayName || item.name,
            item.pricing.finalPrice,
            Number(item.quantity),
          ],
        );
      }

      await connection.query(
        "INSERT INTO payments (user_id, order_id, paypal_order_id, status, amount, currency, raw_response) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          req.user.id,
          orderResult.insertId,
          paypalOrderId,
          ORDER_STATUS.PENDING,
          Number(total),
          PAYPAL_CURRENCY,
          JSON.stringify(response.data),
        ],
      );

      await connection.commit();
      connection.release();

      logPayPalFlow("order-created", {
        userId: req.user?.id || null,
        orderId: orderResult.insertId,
        paypalOrderId,
        status: ORDER_STATUS.PENDING,
      });

      logPayPalFlow("user-redirected-to-paypal", {
        userId: req.user?.id || null,
        orderId: orderResult.insertId,
        paypalOrderId,
      });

      logPayPalFlow("final-status-assigned", {
        userId: req.user?.id || null,
        orderId: orderResult.insertId,
        paypalOrderId,
        finalStatus: ORDER_STATUS.PENDING,
      });

      return res.status(200).json({
        orderID: paypalOrderId,
        orderId: orderResult.insertId,
        total: total.toFixed(2),
        currency: PAYPAL_CURRENCY,
        status: ORDER_STATUS.PENDING,
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      console.error("[paypal:create-order] transaction error", {
        userId: req.user?.id || null,
        error: transactionError.message,
      });
      return res.status(500).json({
        message: "Unable to persist pending PayPal order",
      });
    }
  } catch (error) {
    console.error("[paypal:create-order]", error.message || error);
    return res.status(500).json({
      message:
        error?.response?.data?.message ||
        error.message ||
        "Unable to create PayPal order",
    });
  }
};

// Captures a completed PayPal order and persists the payment.
const capturePaypalOrder = async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ message: "PayPal order ID is required" });
    }

    logPayPalFlow("paypal-approval-success", {
      orderId: orderID,
      userId: req.user?.id,
    });

    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const accessToken = await getPayPalAccessToken();

    logPayPalFlow("capture-called", {
      orderId: orderID,
      userId: req.user?.id,
    });

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const captureData = response.data;
    const captureStatus = captureData.status;
    console.log("[paypal:capture] payment captured", {
      orderId: orderID,
      status: captureStatus,
      userId: req.user?.id,
    });
    const finalOrderStatus = normalizeOrderStatusFromCapture(captureStatus);
    const captureUnit =
      captureData.purchase_units?.[0]?.payments?.captures?.[0] || null;
    const amountValue = captureUnit?.amount?.value || "0.00";
    const currencyCode = captureUnit?.amount?.currency_code || PAYPAL_CURRENCY;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [users] = await connection.query(
        "SELECT id, username, email FROM users WHERE id = ? LIMIT 1",
        [req.user.id],
      );

      const userRecord = users[0] || null;

      if (!userRecord) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: "User not found" });
      }

      const [existingPayments] = await connection.query(
        `
          SELECT id, order_id, status
          FROM payments
          WHERE paypal_order_id = ? AND user_id = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [orderID, req.user.id],
      );

      let orderId = existingPayments[0]?.order_id || null;

      if (!orderId) {
        const { total, items } = await calculateCartTotal(req.user.id);

        const [orderResult] = await connection.query(
          "INSERT INTO orders (user_id, total, customer_email, status, created_at) VALUES (?, ?, ?, ?, NOW())",
          [
            req.user.id,
            total,
            userRecord.email || captureData?.payer?.email_address || null,
            ORDER_STATUS.PENDING,
          ],
        );

        orderId = orderResult.insertId;

        for (const item of items) {
          await connection.query(
            "INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)",
            [
              orderId,
              item.id,
              item.displayName || item.name,
              item.pricing.finalPrice,
              Number(item.quantity),
            ],
          );
        }

        await connection.query(
          "INSERT INTO payments (user_id, order_id, paypal_order_id, status, amount, currency, raw_response) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            req.user.id,
            orderId,
            orderID,
            ORDER_STATUS.PENDING,
            Number(amountValue),
            currencyCode,
            JSON.stringify(captureData),
          ],
        );
      }

      await connection.query(
        "UPDATE orders SET status = ?, total = ?, customer_email = COALESCE(?, customer_email), created_at = created_at WHERE id = ?",
        [
          finalOrderStatus,
          Number(amountValue),
          userRecord.email || captureData?.payer?.email_address || null,
          orderId,
        ],
      );

      await connection.query(
        "UPDATE payments SET status = ?, amount = ?, currency = ?, raw_response = ? WHERE paypal_order_id = ? AND user_id = ?",
        [
          finalOrderStatus,
          Number(amountValue),
          currencyCode,
          JSON.stringify(captureData),
          orderID,
          req.user.id,
        ],
      );

      if (finalOrderStatus === ORDER_STATUS.SUCCESS) {
        const [cartRows] = await connection.query(
          `
            SELECT p.id, p.stock, ci.quantity
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.user_id = ?
          `,
          [req.user.id],
        );

        for (const item of cartRows) {
          await connection.query(
            "UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?",
            [Number(item.quantity), item.id],
          );
        }

        await connection.query("DELETE FROM cart_items WHERE user_id = ?", [
          req.user.id,
        ]);
      }

      await connection.commit();
      connection.release();

      logPayPalFlow("capture-success", {
        orderId,
        paypalOrderId: orderID,
        userId: req.user?.id,
        captureStatus,
      });

      logPayPalFlow("final-status-assigned", {
        orderId,
        paypalOrderId: orderID,
        userId: req.user?.id,
        finalStatus: finalOrderStatus,
      });

      if (finalOrderStatus === ORDER_STATUS.SUCCESS) {
        try {
          console.log("[paypal:invoice] sending invoice email", {
            orderId,
            paypalOrderId: orderID,
            userId: req.user.id,
            customerEmail:
              userRecord.email || captureData?.payer?.email_address || null,
          });
          await sendInvoiceEmail({
            orderId,
            userId: req.user.id,
            paypalOrderId: orderID,
          });
          console.log("[paypal:invoice] invoice email sent", {
            orderId,
            paypalOrderId: orderID,
            userId: req.user.id,
          });
        } catch (invoiceError) {
          console.error(
            "[paypal:invoice] email send error",
            invoiceError.message || invoiceError,
          );
        }
      }

      return res.status(200).json({
        message: "Payment captured and order persisted successfully",
        order: {
          id: orderId,
          total: Number(amountValue),
          status: finalOrderStatus,
        },
        payment: {
          paypalOrderId: orderID,
          status: finalOrderStatus,
          amount: Number(amountValue),
          currency: currencyCode,
        },
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      console.error(
        "[paypal:capture] transaction error",
        transactionError.message,
      );
      return res
        .status(500)
        .json({ message: "Server error during payment persistence" });
    }
  } catch (error) {
    console.error("[paypal:capture]", error.message || error);

    const finalUnsuccessfulStatus = ORDER_STATUS.UNSUCCESSFUL;

    logPayPalFlow("capture-unsuccessful", {
      paypalOrderId: req.body?.orderID || null,
      userId: req.user?.id || null,
      reason:
        error?.response?.data?.details?.[0]?.description ||
        error?.response?.data?.message ||
        error.message ||
        "capture-error",
      finalStatus: finalUnsuccessfulStatus,
    });

    if (req.body?.orderID && req.user?.id) {
      try {
        await db.query(
          "UPDATE payments SET status = ?, raw_response = ? WHERE paypal_order_id = ? AND user_id = ?",
          [
            finalUnsuccessfulStatus,
            JSON.stringify({
              error:
                error?.response?.data ||
                error.message ||
                "Capture unsuccessful",
              markedAt: new Date().toISOString(),
            }),
            req.body.orderID,
            req.user.id,
          ],
        );
        await db.query(
          `
            UPDATE orders o
            JOIN payments p ON p.order_id = o.id
            SET o.status = ?
            WHERE p.paypal_order_id = ? AND p.user_id = ?
          `,
          [finalUnsuccessfulStatus, req.body.orderID, req.user.id],
        );

        logPayPalFlow("final-status-assigned", {
          orderId: null,
          paypalOrderId: req.body.orderID,
          userId: req.user.id,
          finalStatus: finalUnsuccessfulStatus,
          reason: "capture-error",
        });
      } catch (statusUpdateError) {
        console.error("[paypal:capture] unable to mark unsuccessful", {
          orderId: req.body.orderID,
          userId: req.user.id,
          error: statusUpdateError.message,
        });
      }
    }

    return res.status(500).json({
      message:
        error?.response?.data?.details?.[0]?.description ||
        error?.response?.data?.message ||
        "Unable to capture PayPal order",
    });
  }
};

const markPaypalOrderAsUnsuccessful = async ({
  orderID,
  userId = null,
  reason = "paypal-cancel",
}) => {
  if (!orderID) {
    return { updated: false, orderId: null };
  }

  let whereClause = "p.paypal_order_id = ?";
  const whereParams = [orderID];
  if (userId) {
    whereClause += " AND p.user_id = ?";
    whereParams.push(userId);
  }

  const rawResponse = JSON.stringify({
    reason,
    markedAt: new Date().toISOString(),
  });

  const [result] = await db.query(
    `
      UPDATE orders o
      JOIN payments p ON p.order_id = o.id
      SET
        o.status = CASE WHEN o.status = ? THEN o.status ELSE ? END,
        p.status = CASE WHEN p.status = ? THEN p.status ELSE ? END,
        p.raw_response = ?
      WHERE ${whereClause}
    `,
    [
      ORDER_STATUS.SUCCESS,
      ORDER_STATUS.UNSUCCESSFUL,
      ORDER_STATUS.SUCCESS,
      ORDER_STATUS.UNSUCCESSFUL,
      rawResponse,
      ...whereParams,
    ],
  );

  const [paymentRows] = await db.query(
    `
      SELECT order_id
      FROM payments
      WHERE paypal_order_id = ?
      ${userId ? "AND user_id = ?" : ""}
      ORDER BY id DESC
      LIMIT 1
    `,
    userId ? [orderID, userId] : [orderID],
  );

  return {
    updated: Number(result?.affectedRows || 0) > 0,
    orderId: paymentRows[0]?.order_id || null,
  };
};

const handlePaypalSuccessReturn = async (req, res) => {
  const orderID = (req.query.token || req.query.orderID || "")
    .toString()
    .trim();

  if (!orderID) {
    return res.redirect(
      `${FRONTEND_BASE_URL}/?paypalUnsuccessful=1&reason=missingToken`,
    );
  }

  try {
    const [paymentRows] = await db.query(
      `
        SELECT user_id
        FROM payments
        WHERE paypal_order_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [orderID],
    );

    if (!paymentRows.length) {
      logPayPalFlow("capture-unsuccessful", {
        paypalOrderId: orderID,
        reason: "payment-row-not-found",
      });
      return res.redirect(
        `${FRONTEND_BASE_URL}/?paypalUnsuccessful=1&token=${encodeURIComponent(orderID)}`,
      );
    }

    const userId = Number(paymentRows[0].user_id);

    const fakeReq = {
      body: { orderID },
      user: { id: userId },
    };

    const fakeRes = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.payload = data;
        return this;
      },
    };

    await capturePaypalOrder(fakeReq, fakeRes);

    if (fakeRes.statusCode >= 400) {
      return res.redirect(
        `${FRONTEND_BASE_URL}/?paypalUnsuccessful=1&token=${encodeURIComponent(orderID)}`,
      );
    }

    const resolvedOrderId = fakeRes.payload?.order?.id || "";
    return res.redirect(
      `${FRONTEND_BASE_URL}/?paypalSuccess=1&orderId=${encodeURIComponent(resolvedOrderId || orderID)}`,
    );
  } catch (error) {
    console.error("[paypal:success-return]", error.message || error);
    return res.redirect(
      `${FRONTEND_BASE_URL}/?paypalUnsuccessful=1&token=${encodeURIComponent(orderID)}`,
    );
  }
};

const handlePaypalCancelReturn = async (req, res) => {
  const orderID = (req.query.token || req.query.orderID || "")
    .toString()
    .trim();

  if (!orderID) {
    return res.redirect(
      `${FRONTEND_BASE_URL}/?paypalUnsuccessful=1&reason=missingToken`,
    );
  }

  try {
    logPayPalFlow("user-cancelled-paypal", {
      paypalOrderId: orderID,
      source: "paypal-cancel-return",
    });

    const update = await markPaypalOrderAsUnsuccessful({
      orderID,
      reason: "paypal-cancel-return",
    });

    if (update.updated) {
      logPayPalFlow("final-status-assigned", {
        paypalOrderId: orderID,
        orderId: update.orderId,
        finalStatus: ORDER_STATUS.UNSUCCESSFUL,
      });
    }

    return res.redirect(
      `${FRONTEND_BASE_URL}/?paypalUnsuccessful=1&orderId=${encodeURIComponent(update.orderId || orderID)}`,
    );
  } catch (error) {
    console.error("[paypal:cancel-return]", error.message || error);
    return res.redirect(
      `${FRONTEND_BASE_URL}/?paypalUnsuccessful=1&token=${encodeURIComponent(orderID)}`,
    );
  }
};

const cancelPaypalOrder = async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ message: "PayPal order ID is required" });
    }

    logPayPalFlow("user-cancelled-paypal", {
      paypalOrderId: orderID,
      userId: req.user?.id || null,
    });

    const update = await markPaypalOrderAsUnsuccessful({
      orderID,
      userId: req.user.id,
      reason: "frontend-cancel",
    });

    if (!update.updated) {
      return res.status(404).json({
        message: "Pending PayPal order not found for cancellation",
      });
    }

    logPayPalFlow("final-status-assigned", {
      paypalOrderId: orderID,
      userId: req.user?.id || null,
      orderId: update.orderId,
      finalStatus: ORDER_STATUS.UNSUCCESSFUL,
    });

    return res.status(200).json({
      message: "PayPal order marked as unsuccessful",
      status: ORDER_STATUS.UNSUCCESSFUL,
    });
  } catch (error) {
    console.error("[paypal:cancel]", error.message || error);
    return res.status(500).json({
      message: "Unable to mark PayPal order as unsuccessful",
    });
  }
};

// Returns every order for the admin dashboard view.
const getAdminOrders = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          o.id,
          o.user_id,
          u.username,
          u.email,
          o.total,
          o.status,
          o.created_at,
          COUNT(oi.id) AS item_count
        FROM orders o
        JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id, o.user_id, u.username, u.email, o.total, o.status, o.created_at
        ORDER BY o.created_at DESC, o.id DESC
      `,
    );

    return res.status(200).json(
      rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        total: Number(row.total),
        status: row.status,
        itemCount: Number(row.item_count),
        createdAt: row.created_at,
      })),
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Returns the items that belong to one admin order.
const getOrderItems = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // First, verify the order exists and admin has access
    const [orders] = await db.query(
      `
        SELECT o.id, o.user_id, o.total, o.status, o.created_at, o.customer_email, u.username, u.email
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
        LIMIT 1
      `,
      [orderId],
    );

    if (!orders.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Get order items
    const [items] = await db.query(
      `
        SELECT
          oi.id,
          oi.product_id,
          oi.name,
          oi.price,
          oi.quantity,
          p.size,
          p.category_id,
          c.name AS category_name
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `,
      [orderId],
    );

    const [payments] = await db.query(
      `
        SELECT paypal_order_id, status AS payment_status, amount, currency, created_at
        FROM payments
        WHERE order_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [orderId],
    );

    const order = orders[0];
    const vatRate = await getVatRateFromDb(db);
    const pricing = calculateVatPricing(order.total, vatRate);

    return res.status(200).json({
      order: {
        id: order.id,
        userId: order.user_id,
        username: order.username,
        email: order.customer_email || order.email,
        total: Number(order.total),
        status: order.status,
        createdAt: order.created_at,
        payment: payments[0]
          ? {
              paypalOrderId: payments[0].paypal_order_id,
              status: payments[0].payment_status,
              amount: Number(payments[0].amount),
              currency: payments[0].currency,
              createdAt: payments[0].created_at,
            }
          : null,
        pricing: {
          basePrice: roundMoney(pricing.basePrice),
          vatAmount: roundMoney(pricing.vatAmount),
          finalPrice: roundMoney(pricing.finalPrice),
          vatRate: roundMoney(pricing.vatRate),
        },
      },
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        name: item.name,
        size: item.size || "",
        category: item.category_name || "",
        quantity: Number(item.quantity),
        price: Number(item.price),
        subtotal: roundMoney(Number(item.price) * Number(item.quantity)),
      })),
    });
  } catch (error) {
    console.error("Get order items error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  checkout,
  quickCheckout,
  createPaypalConfig,
  createPaypalOrder,
  capturePaypalOrder,
  handlePaypalSuccessReturn,
  handlePaypalCancelReturn,
  cancelPaypalOrder,
  getAdminOrders,
  getOrderItems,
};
