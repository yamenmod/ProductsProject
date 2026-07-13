/**
 * Cart Page
 * Shopping cart page displaying items, quantities, and pricing
 * Features PayPal checkout, quantity management, and VAT calculation
 */
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  getBasePrice,
  getDisplayPrice,
  fetchVatRate,
  resetVatRateCache,
} from "../utils/pricing";

// Add spinner animation
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

function Cart({
  session,
  user,
  preferredGender,
  currentPage,
  onNavigate,
  onPreferredGenderChange,
  onLogout,
  cartItems = [],
  onRemoveFromCart,
  onUpdateCartQuantity,
  cartCount = 0,
  maxQuantityPerProduct,
}) {
  const [displayItems, setDisplayItems] = useState(cartItems);
  const [pendingRemoveItem, setPendingRemoveItem] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [paypalMessage, setPaypalMessage] = useState("");
  const [isPayPalLoading, setIsPayPalLoading] = useState(false);
  const [vatRate, setVatRate] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [itemError, setItemError] = useState(null);

  console.log("[Cart] maxQuantityPerProduct prop:", maxQuantityPerProduct);

  const normalizeCartItems = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) => {
      if (item?.product) {
        const product = item.product;
        const productId = product.id || product._id;

        return {
          ...product,
          id: productId,
          _id: productId,
          size: product.size || item.size || "",
          quantity: Number(item.quantity) || 1,
        };
      }

      const productId = item?.id || item?._id;

      return {
        ...item,
        id: productId,
        _id: productId,
        size: item.size || item?.product?.size || "",
        quantity: Number(item?.quantity) || 1,
      };
    });

  const handleRemoveClick = (item) => {
    if (!item?.id || typeof onRemoveFromCart !== "function") {
      return;
    }

    setPendingRemoveItem(item);
  };

  const handleCloseRemoveDialog = () => {
    if (isRemoving) {
      return;
    }

    setPendingRemoveItem(null);
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemoveItem?.id || typeof onRemoveFromCart !== "function") {
      return;
    }

    try {
      setIsRemoving(true);
      await onRemoveFromCart(
        pendingRemoveItem.id,
        pendingRemoveItem.size || "",
      );
      // Manually update displayItems to remove the item immediately
      setDisplayItems((prevItems) =>
        prevItems.filter(
          (item) =>
            !(
              item.id === pendingRemoveItem.id &&
              (item.size || "") === (pendingRemoveItem.size || "")
            ),
        ),
      );
      setPendingRemoveItem(null);
      setErrorMessage("");
    } catch (error) {
      console.error("Remove item failed:", error.message);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleChangeQuantity = async (item, delta) => {
    if (!item?.id || typeof onUpdateCartQuantity !== "function") {
      return;
    }

    const currentQuantity = Number(item.quantity) || 1;
    const nextQuantity = currentQuantity + delta;

    if (nextQuantity <= 0) {
      setPendingRemoveItem(item);
      setErrorMessage("");
      setItemError(null);
      return;
    }

    // Clear previous item error when trying to change quantity
    setItemError(null);

    // Client-side check for max quantity per product
    if (delta > 0 && nextQuantity > maxQuantityPerProduct) {
      setItemError({
        itemId: item.id,
        message: `You cannot add more items. The maximum limit per user is ${maxQuantityPerProduct}.`,
      });
      return;
    }

    // Check if trying to increase quantity on out-of-stock item
    if (delta > 0 && (item.stock ?? 0) < nextQuantity) {
      setItemError({
        itemId: item.id,
        message:
          "This product is out of stock. You've reached the stock limit. We apologize for the inconvenience. Please check back later or contact us for availability updates.",
      });
      return;
    }

    try {
      await onUpdateCartQuantity(item.id, nextQuantity, item.size || "");
      setErrorMessage("");
      setItemError(null);
    } catch (err) {
      console.log("[Cart] Quantity update error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to update quantity";
      console.log("[Cart] Error message:", msg);
      setItemError({
        itemId: item.id,
        message: msg,
      });
    }
  };

  const openPayPalModal = () => {
    if (!session?.token) {
      setErrorMessage("Please sign in to complete purchases.");
      return;
    }

    if (!paypalConfig) {
      setErrorMessage(
        "PayPal is not configured for this environment. Contact support.",
      );
      return;
    }

    // Check if there are out-of-stock items
    if (hasOutOfStockItems) {
      setErrorMessage(
        "Some items in your cart are out of stock. You've reached the stock limit. We apologize for the inconvenience. Please remove out-of-stock items or check back later for availability updates.",
      );
      return;
    }

    setIsPayPalModalOpen(true);
  };

  // Initiate PayPal checkout by creating an order server-side and redirecting
  // the user to PayPal's approval page. This prevents immediate server-side
  // fulfillment without payment.
  const handleBuyNow = async () => {
    if (!session?.token) {
      alert("Please sign in to complete purchases.");
      return;
    }

    if (!paypalConfig) {
      alert("PayPal is not configured for this environment. Contact support.");
      return;
    }

    try {
      setIsPayPalLoading(true);
      setPaypalMessage("");
      const resp = await axios.post(
        "/api/cart/paypal/create-order",
        {},
        { headers: { Authorization: `Bearer ${session.token}` } },
      );

      const orderID = resp.data?.orderID || resp.data?.id;
      if (!orderID) {
        throw new Error("No PayPal order ID returned");
      }

      window.location.href = `https://www.sandbox.paypal.com/checkoutnow?token=${encodeURIComponent(orderID)}`;
    } catch (error) {
      console.error(
        "Failed to start PayPal checkout:",
        error?.response || error,
      );
      setPaypalMessage(
        "Unable to start PayPal checkout. Please try again later.",
      );
    } finally {
      setIsPayPalLoading(false);
    }
  };

  const loadPayPalConfig = useCallback(async () => {
    if (!session?.token || displayItems.length === 0) {
      return;
    }

    try {
      setIsPayPalLoading(true);
      setPaypalMessage("");
      const response = await axios.get("/api/cart/paypal/config", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.data?.clientId) {
        setPaypalMessage("PayPal is not configured for this environment.");
        return;
      }

      setPaypalConfig(response.data);
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message || error.message || "Unknown error";
      console.error("Failed to load PayPal configuration:", errorMsg);
      setPaypalMessage(`PayPal Error: ${errorMsg}`);
    } finally {
      setIsPayPalLoading(false);
    }
  }, [displayItems.length, session?.token]);

  useEffect(() => {
    setDisplayItems(cartItems);
  }, [cartItems]);

  useEffect(() => {
    if (displayItems.length === 0) {
      setIsPayPalModalOpen(false);
    }
  }, [displayItems.length]);

  useEffect(() => {
    loadPayPalConfig();
  }, [loadPayPalConfig]);

  const parseImageValue = (value) => {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => parseImageValue(item));
    }

    if (typeof value !== "string") {
      return [];
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) => parseImageValue(item));
        }
      } catch (error) {
        // fallback to loose parsing
      }

      return trimmed
        .slice(1, -1)
        .split(",")
        .map((part) => part.trim().replace(/^['"]+|['"]+$/g, ""))
        .filter(Boolean);
    }

    const values = trimmed.includes(",")
      ? trimmed
          .split(",")
          .map((part) => part.trim().replace(/^['"]+|['"]+$/g, ""))
      : [trimmed];

    return values
      .map((part) => part.replace(/\\/g, "/").trim())
      .map((part) => {
        if (!part) {
          return "";
        }

        // If the string contains a filename (jpg/png/webp/gif), extract it.
        const filenameMatch = part.match(
          /([\w\-.]+\.(?:jpg|jpeg|png|gif|webp))(?:\?.*)?$/i,
        );
        if (filenameMatch) {
          part = filenameMatch[1];
        }

        if (part === "[]" || part.endsWith("/[]")) {
          return "";
        }

        if (part.toLowerCase().startsWith("data:image/")) {
          return part;
        }

        if (part.toLowerCase().startsWith("data:")) {
          return "";
        }

        if (part.toLowerCase().startsWith("blob:")) {
          return "";
        }

        if (
          (part.startsWith("http://") || part.startsWith("https://")) &&
          part.includes("localhost:5000")
        ) {
          try {
            return new URL(part).pathname || "";
          } catch (error) {
            return part;
          }
        }

        return part;
      })
      .filter(Boolean);
  };

  const resolveImageSrc = (imagePath) => {
    // sanitize empty or array-like values
    if (!imagePath) return "https://via.placeholder.com/120x120?text=No+Image";

    let normalized = imagePath.toString().replace(/\\/g, "/").trim();

    // Handle backend bug: /uploads/[] should map to public/assets/img/products/
    if (normalized === "/uploads/[]" || normalized === "uploads/[]") {
      // Return empty to trigger fallback in onError handler
      return "about:blank";
    }

    // strip any stray brackets or empty-array markers
    normalized = normalized.replace(/\[|\]/g, "").trim();
    if (!normalized) return "https://via.placeholder.com/120x120?text=No+Image";

    // if it's already a full URL, use it
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized;
    }

    // If it's an absolute public path served by backend (/public/... or /uploads/...)
    if (normalized.startsWith("/public/") || normalized.startsWith("public/")) {
      // ensure leading slash for server mapping
      const pathPart = normalized.startsWith("/")
        ? normalized
        : `/${normalized}`;
      return `http://localhost:5000${pathPart}`;
    }

    if (
      normalized.startsWith("/uploads/") ||
      normalized.startsWith("uploads/")
    ) {
      const pathPart = normalized.startsWith("/")
        ? normalized
        : `/${normalized}`;
      return `http://localhost:5000${pathPart}`;
    }

    // If a full filesystem path was provided (Windows E:\...), extract filename
    if (
      /^[A-Za-z]:\\/.test(normalized) ||
      normalized.includes("E:/") ||
      normalized.includes(":/")
    ) {
      const filename = normalized.split(/\\|\//).pop();
      return `http://localhost:5000/public/assets/img/products/${filename}`;
    }

    // Fallback: treat the value as a filename and map into public assets
    const filename = normalized.split("/").pop();
    return `http://localhost:5000/public/assets/img/products/${filename}`;
  };

  const getProductImages = (product) => {
    const rawImages = [
      ...parseImageValue(product?.image_urls),
      ...parseImageValue(product?.imageUrls),
      ...parseImageValue(product?.image_url),
      ...parseImageValue(product?.image),
    ];

    const uniqueImages = [...new Set(rawImages.filter(Boolean))];

    return uniqueImages.length
      ? uniqueImages.map((imagePath) => resolveImageSrc(imagePath))
      : [resolveImageSrc("")];
  };

  useEffect(() => {
    const loadCart = async () => {
      if (!session?.token) {
        return;
      }

      try {
        resetVatRateCache();
        const currentVatRate = await fetchVatRate();
        console.log("[vat:cart-state]", { currentVatRate });
        setVatRate(currentVatRate);
        const response = await axios.get("/api/cart", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        setDisplayItems(
          normalizeCartItems(response.data.items || response.data),
        );
      } catch (error) {
        console.error("Failed to load cart page items:", error.message);
      }
    };

    loadCart();
  }, [session?.token]);

  const subtotal = displayItems.reduce(
    (runningTotal, item) =>
      runningTotal + getBasePrice(item) * (Number(item.quantity) || 1),
    0,
  );
  const total = displayItems.reduce(
    (runningTotal, item) =>
      runningTotal + getDisplayPrice(item) * (Number(item.quantity) || 1),
    0,
  );
  const tax = Math.max(0, total - subtotal);
  const vatPercent = subtotal > 0 ? Math.round((tax / subtotal) * 100) : 0;
  const resolvedVatRate = vatPercent / 100;

  // Check for out-of-stock items
  const outOfStockItems = displayItems.filter((item) => {
    const stock = Number(item.stock || 0);
    const sizeStock = item.size_stock ? JSON.parse(item.size_stock) : null;
    const quantity = Number(item.quantity || 1);

    if (sizeStock && item.size) {
      const sizeKey = item.size.toUpperCase();
      const availableSizeStock = Number(sizeStock[sizeKey] || 0);
      return quantity > availableSizeStock;
    }

    return quantity > stock;
  });

  const hasOutOfStockItems = outOfStockItems.length > 0;

  useEffect(() => {
    if (!displayItems.length && vatRate === null) {
      return;
    }

    console.log("[vat:cart-calculation]", {
      displayItemVatRate: displayItems?.[0]?.pricing?.vatRate,
      stateVatRate: vatRate,
      calculatedVatRate: tax / (subtotal || 1),
      resolvedVatRate,
      vatPercent,
      subtotal,
      total,
      tax,
    });
  }, [
    displayItems,
    vatRate,
    resolvedVatRate,
    vatPercent,
    subtotal,
    total,
    tax,
  ]);

  return (
    <div className="ps-page">
      <Header
        user={user}
        preferredGender={preferredGender}
        onPreferredGenderChange={onPreferredGenderChange}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartCount}
      />

      <main className="ps-main" style={{ padding: "70px 0" }}>
        <div
          className="ps-shell"
          style={{ maxWidth: "1080px", margin: "0 auto" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px",
            }}
          >
            <div>
              <p className="ps-pill" style={{ marginBottom: "12px" }}>
                Your cart
              </p>
              <h1 className="ps-title">Shopping Cart</h1>
            </div>
            <button
              type="button"
              className="ps-btn ps-btn-primary"
              onClick={() => onNavigate("products", "")}
            >
              Continue shopping
            </button>
          </div>

          {displayItems.length === 0 ? (
            <div
              className="ps-surface"
              style={{ padding: "40px", textAlign: "center" }}
            >
              <p style={{ margin: 0, fontSize: "18px", color: "#65574d" }}>
                Your cart is empty. Add products from the home page or the shop.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "24px" }}>
              {errorMessage && (
                <div
                  style={{
                    padding: "16px",
                    background: "#fff3cd",
                    border: "1px solid #ffc107",
                    borderRadius: "8px",
                    color: "#856404",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ flex: 1 }}>{errorMessage}</span>
                    <button
                      onClick={() => setErrorMessage("")}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "18px",
                        cursor: "pointer",
                        color: "#856404",
                        padding: 0,
                        marginLeft: "8px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {errorMessage.includes("bulk orders") && (
                    <button
                      type="button"
                      className="ps-btn ps-btn-primary"
                      onClick={() => onNavigate("contact")}
                      style={{
                        padding: "10px 16px",
                        fontSize: "13px",
                        alignSelf: "flex-start",
                      }}
                    >
                      Contact us for bulk orders
                    </button>
                  )}
                </div>
              )}
              {displayItems.map((item) => {
                console.log("[vat:product-card-label]", {
                  itemId: item.id,
                  size: item.size || "default",
                  vatPercent,
                });

                return (
                  <div
                    key={`${item.id}-${item.size || "default"}`}
                    className="ps-surface"
                    style={{
                      padding: "24px",
                      display: "grid",
                      gridTemplateColumns: "120px minmax(0, 1fr) 140px",
                      gap: "20px",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={getProductImages(item)[0]}
                      alt={item.name || "Cart product"}
                      onError={(e) => {
                        try {
                          if (!e?.target) return;
                          if (e.target.dataset?.imgerror) return;
                          e.target.dataset.imgerror = "1";

                          console.error(
                            `%c❌ Image failed: ${e.target.src}`,
                            "color: red; font-weight: bold",
                          );

                          // Show placeholder on error since backend now assigns images
                          e.target.src =
                            "https://via.placeholder.com/120x120?text=No+Image";
                        } catch (err) {
                          console.error("Image fallback error:", err);
                          e.target.src =
                            "https://via.placeholder.com/120x120?text=No+Image";
                        }
                      }}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "18px",
                        background: "#efefef",
                      }}
                    />
                    <div>
                      <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>
                        {item.name || "Product"}
                      </h2>
                      <p
                        style={{
                          margin: "0 0 8px",
                          color: "#65574d",
                          fontSize: "14px",
                        }}
                      >
                        {item.category || ""}
                      </p>
                      {item.size ? (
                        <p
                          style={{
                            margin: "0 0 8px",
                            color: "#65574d",
                            fontSize: "14px",
                          }}
                        >
                          Size: {item.size}
                        </p>
                      ) : null}
                      {(() => {
                        const stock = Number(item.stock || 0);
                        let sizeStock = null;
                        try {
                          sizeStock = item.size_stock
                            ? JSON.parse(item.size_stock)
                            : null;
                        } catch (e) {
                          console.error(
                            "Failed to parse size_stock:",
                            item.size_stock,
                            e,
                          );
                        }
                        const quantity = Number(item.quantity || 1);
                        let available = stock;

                        if (sizeStock && item.size) {
                          const sizeKey = item.size.toUpperCase();
                          available = Number(sizeStock[sizeKey] || 0);
                        }

                        if (quantity > available) {
                          return (
                            <p
                              style={{
                                margin: "0 0 8px",
                                color: "#dc3545",
                                fontSize: "13px",
                                fontWeight: 600,
                              }}
                            >
                              ⚠️ This product is currently out of stock
                            </p>
                          );
                        }
                        return null;
                      })()}
                      <div
                        style={{ margin: 0, color: "#1f1813", fontWeight: 700 }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: "14px",
                            color: "#65574d",
                            textDecoration: "line-through",
                          }}
                        >
                          ${getBasePrice(item).toFixed(2)}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#1f1813",
                            marginTop: "4px",
                          }}
                        >
                          ${getDisplayPrice(item).toFixed(2)} x{" "}
                          {item.quantity || 1}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#999",
                            marginTop: "6px",
                            fontWeight: 400,
                          }}
                        >
                          VAT included ({vatPercent}%)
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "6px",
                        }}
                      >
                        {itemError?.itemId === item.id && (
                          <div
                            style={{
                              padding: "8px 12px",
                              background: "#fff3cd",
                              border: "1px solid #ffc107",
                              borderRadius: "6px",
                              color: "#856404",
                              fontSize: "12px",
                              fontWeight: "500",
                              textAlign: "right",
                              maxWidth: "200px",
                            }}
                          >
                            {itemError.message}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#f3f1ed",
                            border: "1px solid #d8d1c8",
                            borderRadius: "999px",
                            padding: "4px 8px",
                          }}
                        >
                          <button
                            type="button"
                            className="ps-btn"
                            style={{
                              width: "28px",
                              height: "28px",
                              padding: 0,
                              borderRadius: "999px",
                              border: "1px solid #c6beb4",
                              background: "#ffffff",
                              color: "#6c6258",
                              fontSize: "18px",
                              fontWeight: 800,
                              lineHeight: 1,
                              boxShadow: "none",
                            }}
                            onClick={() => handleChangeQuantity(item, -1)}
                            aria-label={`Decrease quantity of ${item.name || "item"}`}
                          >
                            -
                          </button>
                          <span
                            style={{
                              minWidth: "20px",
                              textAlign: "center",
                              fontWeight: 800,
                              color: "#5f5550",
                              fontSize: "13px",
                            }}
                          >
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            className="ps-btn"
                            style={{
                              width: "28px",
                              height: "28px",
                              padding: 0,
                              borderRadius: "999px",
                              border: "1px solid #c6beb4",
                              background: "#ffffff",
                              color: "#6c6258",
                              fontSize: "18px",
                              fontWeight: 800,
                              lineHeight: 1,
                              boxShadow: "none",
                            }}
                            onClick={() => handleChangeQuantity(item, 1)}
                            aria-label={`Increase quantity of ${item.name || "item"}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ps-btn ps-btn-secondary"
                        style={{ padding: "9px 16px" }}
                        onClick={() => handleRemoveClick(item)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              <div
                className="ps-surface"
                style={{
                  padding: "28px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "32px",
                }}
              >
                <div style={{ minWidth: "100px" }}>
                  <p
                    style={{
                      margin: "0 0 6px",
                      color: "#65574d",
                      fontSize: "13px",
                    }}
                  >
                    Items
                  </p>
                  <h2 style={{ margin: 0, fontSize: "20px" }}>
                    {displayItems.length}{" "}
                    {displayItems.length === 1 ? "item" : "items"}
                  </h2>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    gap: "48px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ textAlign: "center", minWidth: "80px" }}>
                    <p
                      style={{
                        margin: "0 0 4px",
                        color: "#65574d",
                        fontSize: "12px",
                      }}
                    >
                      Subtotal
                    </p>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>
                      ${subtotal.toFixed(2)}
                    </p>
                  </div>

                  <div style={{ textAlign: "center", minWidth: "80px" }}>
                    <p
                      style={{
                        margin: "0 0 4px",
                        color: "#65574d",
                        fontSize: "12px",
                      }}
                    >
                      Tax ({vatPercent}%)
                    </p>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>
                      ${tax.toFixed(2)}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "center",
                      minWidth: "80px",
                      borderLeft: "2px solid #d9c3ad",
                      paddingLeft: "24px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 4px",
                        color: "#65574d",
                        fontSize: "12px",
                      }}
                    >
                      Total
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        fontSize: "16px",
                        color: "#1f1813",
                      }}
                    >
                      ${total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={openPayPalModal}
                  style={{ padding: "10px 24px", whiteSpace: "nowrap" }}
                  disabled={displayItems.length === 0}
                >
                  Buy Now
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {isPayPalModalOpen && (
        <div
          className="ps-cartConfirmBackdrop"
          onClick={() => setIsPayPalModalOpen(false)}
        >
          <div
            className="ps-cartConfirmCard"
            role="dialog"
            aria-modal="true"
            aria-label="Pay with PayPal"
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: "460px",
              width: "calc(100% - 32px)",
              padding: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "12px",
              }}
            >
              <div>
                <h2
                  className="ps-cartConfirmTitle"
                  style={{ marginBottom: "8px" }}
                >
                  Pay with PayPal
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPayPalModalOpen(false)}
                aria-label="Close PayPal popup"
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "28px",
                  lineHeight: 1,
                  color: "#8b7f74",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            <p
              style={{ margin: "0 0 18px", color: "#65574d", lineHeight: 1.6 }}
            >
              Your payment will open in PayPal's secure checkout window so you
              can complete the purchase safely.
            </p>

            {paypalMessage && (
              <p
                style={{
                  margin: "0 0 16px",
                  color: "#5f5550",
                  fontSize: "13px",
                }}
              >
                {paypalMessage}
              </p>
            )}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ps-btn"
                onClick={handleBuyNow}
                disabled={isPayPalLoading}
                style={{
                  padding: "12px 20px",
                  minWidth: "220px",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(135deg, #003087 0%, #0070e0 100%)",
                  color: "#ffffff",
                  border: "none",
                  boxShadow: "0 10px 18px rgba(0, 48, 135, 0.18)",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isPayPalLoading ? (
                  <>
                    <svg
                      style={{
                        animation: "spin 1s linear infinite",
                        width: "16px",
                        height: "16px",
                      }}
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeOpacity="0.3"
                      />
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                        fill="currentColor"
                      />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.906a.78.78 0 0 1 .77-.644h6.912c2.298 0 4.008.575 5.062 1.654.936.959 1.336 2.326 1.157 4.014-.006.058-.015.117-.022.176-.637 4.186-3.465 6.539-7.398 6.539h-1.925a.78.78 0 0 0-.77.644l-.742 4.698a.641.641 0 0 1-.633.74H7.076z"
                        fill="#003087"
                      />
                      <path
                        d="M21.598 6.896c-.637 4.186-3.465 6.539-7.398 6.539h-1.925a.78.78 0 0 0-.77.644l-.742 4.698a.641.641 0 0 1-.633.74H7.076l-.422 2.678a.641.641 0 0 1-.633.74H2.47a.641.641 0 0 1-.633-.74L4.944 3.906a.78.78 0 0 1 .77-.644h6.912c2.298 0 4.008.575 5.062 1.654.936.959 1.336 2.326 1.157 4.014-.006.058-.015.117-.022.176z"
                        fill="#009cde"
                      />
                    </svg>
                    Pay with PayPal
                  </>
                )}
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-secondary"
                onClick={() => setIsPayPalModalOpen(false)}
                disabled={isPayPalLoading}
                style={{ padding: "12px 18px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRemoveItem && (
        <div
          className="ps-cartConfirmBackdrop"
          onClick={handleCloseRemoveDialog}
        >
          <div
            className="ps-cartConfirmCard"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm remove item"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="ps-pill" style={{ margin: 0, width: "fit-content" }}>
              Confirm action
            </p>
            <h2 className="ps-cartConfirmTitle">Remove item from cart?</h2>
            <p className="ps-cartConfirmText">
              You are about to remove
              <strong> {pendingRemoveItem.name || "this product"}</strong> from
              your cart.
            </p>
            <div className="ps-cartConfirmActions">
              <button
                type="button"
                className="ps-btn ps-cartConfirmCancel"
                onClick={handleCloseRemoveDialog}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ps-btn ps-cartConfirmDelete"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
              >
                {isRemoving ? "Removing..." : "Delete item"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Cart;
