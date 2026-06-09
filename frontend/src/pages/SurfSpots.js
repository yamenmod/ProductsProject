import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getBasePrice } from "../utils/pricing";

function Products({
  session,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  selectedCategory,
  cartItems,
  onAddToCart,
  onNavigate,
  onLogout,
  cartCount = 0,
  cartSuccessMessage,
  cartErrorMessage,
  onClearCartSuccessMessage,
  onClearCartErrorMessage,
  showCartSuccessModal,
  onCloseCartSuccessModal,
  showCartErrorModal,
  onCloseCartErrorModal,
}) {
  const slugifyCategory = (value) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const resolveShopTitle = (category) => {
    const rawNormalized = slugifyCategory(category);
    const normalized = normalizeCategoryValue(category);

    if (!rawNormalized || rawNormalized === "all") {
      return "Product Shop";
    }

    if (normalized === "surfboards") {
      return "Surfboard Shop";
    }

    if (
      rawNormalized === "surfboard accessories" ||
      rawNormalized === "surfboard accessory" ||
      rawNormalized === "surfboard acessory" ||
      rawNormalized === "surfboard acessories"
    ) {
      return "Surfboard Acessory Shop";
    }

    if (
      rawNormalized === "accessories" ||
      rawNormalized === "accessory" ||
      rawNormalized === "acessory" ||
      rawNormalized === "acessories"
    ) {
      return "Accessory Shop";
    }

    if (normalized === "wetsuits") {
      return "Wetsuit Shop";
    }

    if (normalized === "clothing") {
      return "Clothing Shop";
    }

    return "Product Shop";
  };

  const normalizeCategoryValue = (value) => {
    const normalized = slugifyCategory(value);

    if (!normalized) {
      return "";
    }

    if (
      normalized === "accessories" ||
      normalized === "surfboard accessories" ||
      normalized === "accessory" ||
      normalized === "surfboard accessory" ||
      normalized === "acessory" ||
      normalized === "acessories" ||
      normalized === "surfboard acessory" ||
      normalized === "surfboard acessories" ||
      normalized === "leashes" ||
      normalized === "leash" ||
      normalized === "surf wax" ||
      normalized === "wax" ||
      normalized === "fins" ||
      normalized === "fin"
    ) {
      return "accessories";
    }

    return normalized;
  };

  const normalizeGenderValue = (value) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

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
        // Continue with loose parsing fallback.
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

  const canViewProduct = (product) => {
    const gender = normalizeGenderValue(product?.gender || "unisex");
    const shopperGender = normalizeGenderValue(preferredGender || "all");

    if (!shopperGender || shopperGender === "all") {
      return true;
    }

    return gender === "unisex" || gender === shopperGender;
  };

  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(
    selectedCategory || "All",
  );
  const [accessoryFilter, setAccessoryFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewSize, setPreviewSize] = useState("");
  const [cardImageIndices, setCardImageIndices] = useState({});
  const [maxProducts, setMaxProducts] = useState(10);
  const [showBulkOrderCTA, setShowBulkOrderCTA] = useState(false);
  const swipeStartXRef = useRef(null);

  const sizeOptions = ["S", "M", "L", "XL", "XXL"];

  useEffect(() => {
    if (showCartSuccessModal || showCartErrorModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCartSuccessModal, showCartErrorModal]);

  const isClothingProduct = (product) => {
    const normalized = normalizeCategoryValue(product?.category);
    return normalized.includes("clothing") || normalized.includes("wetsuit");
  };

  useEffect(() => {
    const loadData = async () => {
      const productsRes = await axios.get("/api/products");

      setProducts(productsRes.data);
    };

    loadData();
  }, []);

  useEffect(() => {
    setActiveCategory(selectedCategory || "All");
  }, [selectedCategory]);

  useEffect(() => {
    setAccessoryFilter("All");
    if (activeCategory !== "All") {
      setSearchTerm("");
    }
  }, [activeCategory]);

  const handleAddToCart = async (product, size = "") => {
    if (!product) {
      return false;
    }

    const productWithSize = { ...product, size: size || "" };
    const added = await onAddToCart(productWithSize);
    
    return added;
  };

  const handleBuyNow = async (product, size = "") => {
    if (!product) {
      return;
    }

    const added = await handleAddToCart(product, size);
    if (added) {
      onNavigate("cart");
    }
  };

  const handlePreviewAddToCart = async () => {
    if (!previewProduct) {
      return;
    }

    const selectedSize = isClothingProduct(previewProduct) ? previewSize : "";
    await handleAddToCart(previewProduct, selectedSize);
  };

  const handlePreviewBuyNow = async () => {
    if (!previewProduct) {
      return;
    }

    const selectedSize = isClothingProduct(previewProduct) ? previewSize : "";
    await handleAddToCart(previewProduct, selectedSize);
  };

  const categories = [
    "All",
    "Surfboards",
    "Wetsuits",
    "Clothing",
    "Surfboard Accessories",
  ];

  const filteredProducts =
    activeCategory === "All"
      ? products.filter((product) => canViewProduct(product))
      : products.filter(
          (product) =>
            normalizeCategoryValue(product.category) ===
              normalizeCategoryValue(activeCategory) && canViewProduct(product),
        );

  const isAccessoriesCategory =
    normalizeCategoryValue(activeCategory) === "accessories";

  const matchesAccessoryFilter = (product, filterLabel) => {
    if (filterLabel === "All") {
      return true;
    }

    const haystack = `${product.name || ""} ${product.description || ""} ${
      product.category || ""
    }`
      .toLowerCase()
      .trim();

    if (filterLabel === "Leashes") {
      return haystack.includes("leash") || haystack.includes("leashes");
    }

    if (filterLabel === "Surf Wax") {
      return haystack.includes("wax") || haystack.includes("surf wax");
    }

    if (filterLabel === "Fins") {
      return haystack.includes("fin") || haystack.includes("fins");
    }

    return true;
  };

  const visibleProducts = isAccessoriesCategory
    ? filteredProducts.filter((product) =>
        matchesAccessoryFilter(product, accessoryFilter),
      )
    : filteredProducts;

  const searchedProducts =
    activeCategory === "All" && searchTerm.trim()
      ? visibleProducts.filter((product) => {
          const haystack = `${product.name || ""} ${product.category || ""}`
            .toLowerCase()
            .trim();

          return haystack.includes(searchTerm.trim().toLowerCase());
        })
      : visibleProducts;

  const resolveImageSrc = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/400x250?text=Product";
    }

    const normalized = imagePath.replace(/\\/g, "/").trim();

    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized;
    }

    if (
      normalized.startsWith("/uploads/") ||
      normalized.startsWith("/public/")
    ) {
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

  const previewImages = getProductImages(previewProduct);

  const openPreview = (product) => {
    setPreviewProduct(product);
    setPreviewImageIndex(0);
    setPreviewSize("");
  };

  const closePreview = () => {
    setPreviewProduct(null);
    setPreviewImageIndex(0);
    setPreviewSize("");
  };

  const goToPreviewImage = (nextIndex) => {
    if (!previewImages.length) {
      return;
    }

    const safeIndex = (nextIndex + previewImages.length) % previewImages.length;
    setPreviewImageIndex(safeIndex);
  };

  const handlePreviewTouchStart = (event) => {
    swipeStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handlePreviewTouchEnd = (event) => {
    const startX = swipeStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;

    if (startX === null || endX === undefined) {
      return;
    }

    const swipeDistance = startX - endX;
    const swipeThreshold = 40;

    if (swipeDistance > swipeThreshold) {
      goToPreviewImage(previewImageIndex + 1);
    } else if (swipeDistance < -swipeThreshold) {
      goToPreviewImage(previewImageIndex - 1);
    }

    swipeStartXRef.current = null;
  };

  const goToCardImage = (productId, imageCount, delta) => {
    if (!productId || imageCount < 2) {
      return;
    }

    setCardImageIndices((previous) => {
      const currentIndex = previous[productId] || 0;
      const nextIndex = (currentIndex + delta + imageCount) % imageCount;

      return {
        ...previous,
        [productId]: nextIndex,
      };
    });
  };

  return (
    <div className="ps-page">
      <Header
        user={session.user}
        preferredGender={preferredGender}
        onPreferredGenderChange={onPreferredGenderChange}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartCount}
      />

      <div className="ps-main" style={{ padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "40px",
            background: "rgba(255, 250, 242, 0.84)",
            border: "1px solid rgba(31, 24, 19, 0.08)",
            borderRadius: "22px",
            boxShadow: "0 18px 42px rgba(67, 48, 33, 0.12)",
            fontFamily: "Manrope, 'Segoe UI', sans-serif",
          }}
        >
          <div
            style={{
              marginBottom: "32px",
              borderBottom: "1px solid #e0cec0",
              paddingBottom: "20px",
            }}
          >
            <h2
              style={{
                color: "#1f1813",
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: "54px",
                margin: "0 0 8px 0",
                letterSpacing: "1px",
                lineHeight: 0.9,
              }}
            >
              {resolveShopTitle(activeCategory)}
            </h2>
            <p
              style={{
                margin: "0",
                color: "#65574d",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Browse our collection of premium products
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "28px",
            }}
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                style={{
                  padding: "8px 16px",
                  background:
                    activeCategory === category
                      ? "linear-gradient(135deg, #245860 0%, #2f747d 100%)"
                      : "#fff3e5",
                  color: activeCategory === category ? "white" : "#5f5550",
                  border:
                    activeCategory === category ? "none" : "1px solid #d9c3ad",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow:
                    activeCategory === category
                      ? "0 4px 12px rgba(36, 88, 96, 0.2)"
                      : "none",
                }}
                onMouseOver={(e) => {
                  if (activeCategory !== category) {
                    e.target.style.background = "#f4e2cf";
                    e.target.style.borderColor = "#ccb091";
                  }
                }}
                onMouseOut={(e) => {
                  if (activeCategory !== category) {
                    e.target.style.background = "#fff3e5";
                    e.target.style.borderColor = "#d9c3ad";
                  }
                }}
              >
                {category}
              </button>
            ))}
          </div>

          {activeCategory === "All" && (
            <div style={{ marginBottom: "20px" }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by name or category"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  border: "1px solid #d9c3ad",
                  borderRadius: "10px",
                  fontSize: "14px",
                  background: "#fffdf8",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          {cartSuccessMessage && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px",
                background: "#d4edda",
                border: "1px solid #28a745",
                borderRadius: "8px",
                color: "#155724",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <span style={{ flex: 1 }}>{cartSuccessMessage}</span>
              <button
                onClick={onClearCartSuccessMessage}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#155724",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          )}

          {showCartSuccessModal && (
            <div
              className="ps-cartConfirmBackdrop"
              onClick={onCloseCartSuccessModal}
            >
              <div
                className="ps-cartConfirmCard"
                role="dialog"
                aria-modal="true"
                aria-label="Product added to cart"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="ps-pill" style={{ margin: 0, width: "fit-content" }}>
                  Success
                </p>
                <h2 className="ps-cartConfirmTitle">Product added to cart successfully</h2>
                <p className="ps-cartConfirmText">
                  The product has been added to your cart. You can continue shopping or proceed to checkout.
                </p>
                <div className="ps-cartConfirmActions">
                  <button
                    type="button"
                    className="ps-btn ps-cartConfirmCancel"
                    onClick={onCloseCartSuccessModal}
                  >
                    Continue Shopping
                  </button>
                  <button
                    type="button"
                    className="ps-btn ps-cartConfirmDelete"
                    onClick={() => {
                      onCloseCartSuccessModal();
                      onNavigate("cart");
                    }}
                  >
                    Go to Cart
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCartErrorModal && (
            <div
              className="ps-cartConfirmBackdrop"
              onClick={onCloseCartErrorModal}
            >
              <div
                className="ps-cartConfirmCard"
                role="dialog"
                aria-modal="true"
                aria-label="Error adding to cart"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="ps-pill" style={{ margin: 0, width: "fit-content" }}>
                  Error
                </p>
                <h2 className="ps-cartConfirmTitle">Unable to add product to cart</h2>
                <p className="ps-cartConfirmText">
                  {cartErrorMessage}
                </p>
                <div className="ps-cartConfirmActions">
                  <button
                    type="button"
                    className="ps-btn ps-cartConfirmDelete"
                    onClick={onCloseCartErrorModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {cartErrorMessage && (
            <div
              style={{
                marginBottom: "20px",
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
                <span style={{ flex: 1 }}>{cartErrorMessage}</span>
                <button
                  onClick={() => {
                    onClearCartErrorMessage();
                    setShowBulkOrderCTA(false);
                  }}
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
              {showBulkOrderCTA && (
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

          {isAccessoriesCategory && (
            <div
              style={{
                marginBottom: "18px",
                overflowX: "auto",
                whiteSpace: "nowrap",
                paddingBottom: "4px",
              }}
            >
              {["All", "Leashes", "Surf Wax", "Fins"].map((item) => (
                <button
                  key={item}
                  onClick={() => setAccessoryFilter(item)}
                  style={{
                    marginRight: "10px",
                    padding: "8px 16px",
                    borderRadius: "999px",
                    border:
                      accessoryFilter === item ? "none" : "1px solid #d9c3ad",
                    background:
                      accessoryFilter === item
                        ? "linear-gradient(135deg, #245860 0%, #2f747d 100%)"
                        : "#fff3e5",
                    color: accessoryFilter === item ? "#ffffff" : "#5f5550",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <div
            id="products-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {searchedProducts.length === 0 ? (
              <p>
                {activeCategory === "All" && searchTerm.trim()
                  ? "No products match your search."
                  : "No products found. Add your first product."}
              </p>
            ) : (
              searchedProducts.map((product) => {
                const productImages = getProductImages(product);
                const productId = product._id || product.id;
                const activeCardImageIndex = cardImageIndices[productId] || 0;

                return (
                  <div
                    key={productId}
                    className="ps-productCard"
                    style={{
                      border: "1px solid #e0cec0",
                      background: "#fffbf5",
                      boxShadow: "0 12px 30px rgba(76, 56, 38, 0.1)",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => openPreview(product)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: 0,
                          border: 0,
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={productImages[activeCardImageIndex]}
                          alt={product.name}
                          className="ps-productCardImage"
                          style={{
                            width: "100%",
                            aspectRatio: "4 / 5",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </button>

                      {productImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              goToCardImage(productId, productImages.length, -1)
                            }
                            style={{
                              position: "absolute",
                              left: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              border: 0,
                              background: "rgba(10, 16, 20, 0.75)",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "18px",
                              lineHeight: 1,
                            }}
                            aria-label="Previous product image"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              goToCardImage(productId, productImages.length, 1)
                            }
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: "28px",
                              height: "28px",
                              borderRadius: "999px",
                              border: 0,
                              background: "rgba(10, 16, 20, 0.75)",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "18px",
                              lineHeight: 1,
                            }}
                            aria-label="Next product image"
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>
                    <div
                      className="ps-dropBody"
                      style={{ padding: "14px 14px 12px" }}
                    >
                      <h3 className="ps-productCardTitle">{product.name}</h3>
                      <p className="ps-productCardDescription">
                        {product.description}
                      </p>
                      <p className="ps-productCardPrice">
                        <span
                          style={{
                            fontWeight: 800,
                            color: "#1f1813",
                            fontSize: "18px",
                          }}
                        >
                          ${getBasePrice(product).toFixed(2)}
                        </span>
                      </p>
                      <div className="ps-productCardActions">
                        {(() => {
                          const productId = product._id || product.id;
                          const isInCart = (cartItems || []).some((item) => {
                            const itemId = item.id || item._id;
                            return Number(itemId) === Number(productId);
                          });

                          const isOutOfStock = (product.stock ?? 0) < 1;

                          return (
                            <>
                              <button
                                type="button"
                                className="ps-btn ps-btn-primary ps-productCardButton"
                                onClick={() =>
                                  isClothingProduct(product)
                                    ? openPreview(product)
                                    : handleAddToCart(product)
                                }
                                disabled={isOutOfStock}
                              >
                                {isOutOfStock
                                  ? "Out of Stock"
                                  : isInCart
                                    ? "In Cart"
                                    : "Add to Cart"}
                              </button>
                              <button
                                type="button"
                                className="ps-btn ps-btn-dark ps-productCardButton"
                                onClick={() =>
                                  isClothingProduct(product)
                                    ? openPreview(product)
                                    : handleBuyNow(product)
                                }
                              >
                                Buy Now
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {previewProduct && (
        <div className="ps-previewBackdrop" onClick={closePreview}>
          <div
            className="ps-previewCard"
            role="dialog"
            aria-modal="true"
            aria-label={previewProduct.name || "Product preview"}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="ps-previewClose"
              onClick={closePreview}
              aria-label="Close image preview"
            >
              ×
            </button>

            <div className="ps-previewMedia">
              <div
                className="ps-previewStage"
                onTouchStart={handlePreviewTouchStart}
                onTouchEnd={handlePreviewTouchEnd}
              >
                <img
                  className="ps-previewImage"
                  src={previewImages[previewImageIndex]}
                  alt={previewProduct.name || "Product preview"}
                />

                {previewImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="ps-previewArrow ps-previewArrowLeft"
                      onClick={() => goToPreviewImage(previewImageIndex - 1)}
                      aria-label="Previous product image"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="ps-previewArrow ps-previewArrowRight"
                      onClick={() => goToPreviewImage(previewImageIndex + 1)}
                      aria-label="Next product image"
                    >
                      ›
                    </button>
                    <div className="ps-previewCounter">
                      {previewImageIndex + 1} / {previewImages.length}
                    </div>
                  </>
                )}
              </div>

              {previewImages.length > 1 && (
                <div
                  className="ps-previewDots"
                  aria-label="Product image selector"
                >
                  {previewImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      className={
                        index === previewImageIndex
                          ? "ps-previewDot is-active"
                          : "ps-previewDot"
                      }
                      onClick={() => setPreviewImageIndex(index)}
                      aria-label={`Show image ${index + 1} of ${previewImages.length}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="ps-previewMeta">
              <span className="ps-previewBadge">NEW</span>
              <h3 className="ps-previewName">
                {previewProduct.name || "New product"}
              </h3>
              <div
                className="ps-previewPurchaseRow"
                style={{
                  gap: "12px",
                  alignItems: "flex-start",
                  flexDirection: "column",
                }}
              >
                <div>
                  <div
                    className="ps-previewPrice"
                    style={{ display: "grid", gap: "2px" }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#1f1813",
                        fontSize: "22px",
                      }}
                    >
                      ${getBasePrice(previewProduct).toFixed(2)}
                    </span>
                  </div>
                </div>

                {isClothingProduct(previewProduct) && (
                  <select
                    value={previewSize}
                    onChange={(event) => setPreviewSize(event.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d9c3ad",
                      background: "#fffdf8",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="">Select size</option>
                    {sizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                )}

                <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                  <button
                    type="button"
                    className="ps-btn ps-btn-primary"
                    onClick={handlePreviewAddToCart}
                    disabled={
                      (previewProduct.stock ?? 0) < 1 ||
                      (isClothingProduct(previewProduct) && !previewSize)
                    }
                    style={{ flex: 1 }}
                  >
                    {(previewProduct.stock ?? 0) < 1
                      ? "Out of Stock"
                      : "Add to Cart"}
                  </button>
                  <button
                    type="button"
                    className="ps-btn ps-btn-dark"
                    onClick={handlePreviewBuyNow}
                    style={{ flex: 1 }}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Products;
