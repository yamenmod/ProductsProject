import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getBasePrice, getDisplayPrice, getVatAmount, fetchVatRate } from "../utils/pricing";

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

  useEffect(() => {
    setDisplayItems(cartItems);
  }, [cartItems]);

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
    if (!imagePath) {
      return "https://via.placeholder.com/120x120?text=No+Image";
    }

    const normalized = imagePath.replace(/\\/g, "/").trim();

    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized;
    }

    if (normalized.startsWith("/uploads/") || normalized.startsWith("/public/")) {
      return `http://localhost:5000${normalized}`;
    }

    if (normalized.startsWith("uploads/") || normalized.startsWith("public/")) {
      return `http://localhost:5000/${normalized}`;
    }

    if (normalized.startsWith("assets/img/products/")) {
      return `http://localhost:5000/public/${normalized}`;
    }

    if (normalized.startsWith("/assets/img/products/")) {
      return `http://localhost:5000/public${normalized}`;
    }

    return `http://localhost:5000/public/assets/img/products/${normalized.replace(/^\/+/, "")}`;
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

        setDisplayItems(normalizeCartItems(response.data));
      } catch (error) {
        console.error("Failed to load cart page items:", error.message);
      }
    };

    loadCart();
  }, [session?.token]);

  const totalPrice = displayItems.reduce(
    (total, item) =>
      total + getDisplayPrice(item) * (Number(item.quantity) || 1),
    0,
  );

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
        <div className="ps-shell" style={{ maxWidth: "1080px", margin: "0 auto" }}>
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
            <div className="ps-surface" style={{ padding: "40px", textAlign: "center" }}>
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

                        // try resolved candidates
                        const candidates = getProductImages(item);
                        for (const c of candidates) {
                          if (c && c !== e.target.src) {
                            e.target.src = c;
                            return;
                          }
                        }

                        // try building from basename to /uploads/
                        const fallback = (item?.image || item?.image_url || "").toString().split("/").pop();
                        if (fallback) {
                          e.target.src = `http://localhost:5000/uploads/${fallback}`;
                          return;
                        }

                        e.target.src = "https://via.placeholder.com/120x120?text=No+Image";
                      } catch (err) {
                        e.target.src = "https://via.placeholder.com/120x120?text=No+Image";
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
                    <p style={{ margin: "0 0 8px", color: "#65574d", fontSize: "14px" }}>
                      {item.category || ""}
                    </p>
                    <p style={{ margin: 0, color: "#1f1813", fontWeight: 700 }}>
                      <span style={{ display: "block", color: "#8d8178", textDecoration: "line-through", fontSize: "12px", fontWeight: 600 }}>
                        ${getBasePrice(item).toFixed(2)}
                      </span>
                      <span style={{ display: "block", fontSize: "14px", color: "#65574d", marginTop: "4px" }}>
                        + ${getVatAmount(item).toFixed(2)} VAT
                      </span>
                      <span style={{ display: "block", fontSize: "18px", fontWeight: 800, color: "#1f1813", marginTop: "4px" }}>
                        ${getDisplayPrice(item).toFixed(2)} x {item.quantity || 1}
                      </span>
                    </p>
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
                  gap: "20px",
                }}
              >
                <div>
                  <p style={{ margin: "0 0 6px", color: "#65574d" }}>Items</p>
                  <h2 style={{ margin: 0 }}>
                    {displayItems.length} {displayItems.length === 1 ? "item" : "items"}
                  </h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 6px", color: "#65574d" }}>Total</p>
                  <h2 style={{ margin: 0 }}>${totalPrice.toFixed(2)}</h2>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {pendingRemoveItem && (
        <div className="ps-cartConfirmBackdrop" onClick={handleCloseRemoveDialog}>
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
