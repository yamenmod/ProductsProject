import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getBasePrice, getDisplayPrice, fetchVatRate } from "../utils/pricing";

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
  cartCount = 0,
}) {
  const [displayItems, setDisplayItems] = useState(cartItems);
  const [pendingRemoveItem, setPendingRemoveItem] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalMessage, setPaypalMessage] = useState("");
  const [isPayPalLoading, setIsPayPalLoading] = useState(false);

  const normalizeCartItems = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) => {
      if (item?.product) {
        const product = item.product;
        const productId = product.id || product._id;

        return {
          ...product,
          id: productId,
          _id: productId,
          quantity: Number(item.quantity) || 1,
        };
      }

      const productId = item?.id || item?._id;

      return {
        ...item,
        id: productId,
        _id: productId,
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
      await onRemoveFromCart(pendingRemoveItem.id);
      setPendingRemoveItem(null);
    } catch (error) {
      console.error("Remove item failed:", error.message);
    } finally {
      setIsRemoving(false);
    }
  };

  // Checkout the entire cart (backend will validate stock and create order)
  const handleCheckout = async () => {
    if (!session?.token) {
      alert("Please sign in to complete purchases.");
      return;
    }

    try {
      const resp = await axios.post(
        "/api/cart/checkout",
        {},
        { headers: { Authorization: `Bearer ${session.token}` } },
      );

      await refreshCart();
      alert(resp.data?.message || "Purchase completed successfully.");
    } catch (error) {
      console.error(
        "Checkout failed:",
        error?.response?.data || error.message || error,
      );
      const msg =
        (error?.response?.data && error.response.data.message) ||
        "Purchase failed. Please try again or contact support.";
      alert(msg);
    }
  };

  const refreshCart = async () => {
    if (!session?.token) {
      return;
    }

    try {
      const response = await axios.get("/api/cart", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      setDisplayItems(normalizeCartItems(response.data));
    } catch (error) {
      console.error("Failed to refresh cart:", error.message);
    }
  };

  const loadPayPalConfig = async () => {
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

      if (window.paypal) {
        setPaypalReady(true);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        response.data.clientId,
      )}&currency=${encodeURIComponent(response.data.currency)}`;
      script.async = true;
      script.onload = () => setPaypalReady(true);
      script.onerror = () => {
        setPaypalMessage("Failed to load PayPal SDK");
        setPaypalReady(false);
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error("Failed to load PayPal configuration:", error.message);
      setPaypalMessage("Unable to initialize PayPal checkout.");
    } finally {
      setIsPayPalLoading(false);
    }
  };

  useEffect(() => {
    setDisplayItems(cartItems);
  }, [cartItems]);

  useEffect(() => {
    loadPayPalConfig();
  }, [session?.token, displayItems.length]);

  useEffect(() => {
    const renderPayPalButtons = async () => {
      if (!paypalReady || !paypalConfig || displayItems.length === 0) {
        return;
      }

      const container = document.getElementById("paypal-button-container");
      if (!container) {
        return;
      }

      container.innerHTML = "";

      if (!window.paypal || !window.paypal.Buttons) {
        setPaypalMessage("PayPal checkout is unavailable right now.");
        return;
      }

      window.paypal
        .Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
          },
          createOrder: async () => {
            try {
              const response = await axios.post(
                "/api/cart/paypal/create-order",
                {},
                {
                  headers: {
                    Authorization: `Bearer ${session.token}`,
                  },
                },
              );

              return response.data.orderID;
            } catch (error) {
              console.error("PayPal order creation failed:", error?.response || error);
              setPaypalMessage(
                "Could not create PayPal order. Please try again later.",
              );
              throw error;
            }
          },
          onApprove: async (data) => {
            try {
              setPaypalMessage("Finalizing payment...");
              const response = await axios.post(
                "/api/cart/paypal/capture",
                { orderID: data.orderID },
                {
                  headers: {
                    Authorization: `Bearer ${session.token}`,
                  },
                },
              );

              await refreshCart();
              setPaypalMessage(response.data?.message || "Payment successful.");
            } catch (error) {
              console.error("PayPal capture failed:", error?.response || error);
              setPaypalMessage(
                (error?.response?.data && error.response.data.message) ||
                  "Payment could not be completed.",
              );
              throw error;
            }
          },
          onError: (err) => {
            console.error("PayPal button error:", err);
            setPaypalMessage("An error occurred during PayPal checkout.");
          },
          onCancel: () => {
            setPaypalMessage("PayPal checkout was cancelled.");
          },
        })
        .render(container);
    };

    renderPayPalButtons();
  }, [paypalReady, paypalConfig, displayItems.length, session?.token]);

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
        await fetchVatRate();
        const response = await axios.get("/api/cart", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        const normalized = normalizeCartItems(response.data);
        setDisplayItems(normalized);

        // DEBUG: Log what the backend returned for images
        console.group("🛒 CART LOADED - Image Debug");
        normalized.forEach((item) => {
          const imageUrl = item?.image_url || item?.image || item?.imageUrls;
          const resolved = getProductImages(item);
          console.log(`Product: ${item.name || "?"}`, {
            id: item.id,
            backendImageUrl: imageUrl,
            resolvedImages: resolved,
          });
        });
        console.groupEnd();
      } catch (error) {
        console.error("Failed to load cart page items:", error.message);
      }
    };

    loadCart();
  }, [session?.token]);

  // Calculate cart summary
  const subtotal = displayItems.reduce(
    (total, item) =>
      total + getDisplayPrice(item) * (Number(item.quantity) || 1),
    0,
  );
  const shipping = subtotal > 0 ? 10.0 : 0;
  const tax = subtotal > 0 ? subtotal - subtotal / 1.18 : 0;
  const total = Number((subtotal + shipping).toFixed(2));

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
              {displayItems.map((item) => (
                <div
                  key={item.id}
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
                    <div
                      style={{ margin: 0, color: "#1f1813", fontWeight: 700 }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "14px",
                          color: "#65574d",
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
                        VAT included (18%)
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
              ))}

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
                      Shipping
                    </p>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>
                      ${shipping.toFixed(2)}
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
                      Tax (18%)
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
                  onClick={handleCheckout}
                  style={{ padding: "10px 24px", whiteSpace: "nowrap" }}
                  disabled={displayItems.length === 0}
                >
                  Buy Now
                </button>
              </div>

              <div className="ps-surface" style={{ padding: "24px", minHeight: "200px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "18px" }}>
                  Pay with PayPal
                </h3>
                {isPayPalLoading && (
                  <p style={{ color: "#65574d" }}>Loading PayPal checkout...</p>
                )}
                {paypalMessage && (
                  <p style={{ color: "#b94d4d", margin: "0 0 12px" }}>
                    {paypalMessage}
                  </p>
                )}
                <div id="paypal-button-container" />
              </div>
            </div>
          )}
        </div>
      </main>

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
