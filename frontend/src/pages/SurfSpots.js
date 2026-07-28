/**
 * SurfSpots Page (Products)
 * Category-specific product page with horizontal scrolling rails
 * Features product preview modal, size selection, and add to cart functionality
 */
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getBasePrice } from "../utils/pricing";
import "./SurfSpots.css";

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
  maxQuantityPerProduct = 10,
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

      <div className="ps-main surfspots-main">
        <div className="surfspots-shell">
          <div className="surfspots-header">
            <h2 className="surfspots-title">
              {resolveShopTitle(activeCategory)}
            </h2>
            <p className="surfspots-subtitle">
              Browse our collection of premium products
            </p>
          </div>

          <div className="surfspots-category-row">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`surfspots-category-button ${activeCategory === category ? "is-active" : ""}`}
              >
                {category}
              </button>
            ))}
          </div>

          {activeCategory === "All" && (
            <div className="surfspots-search">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by name or category"
                className="surfspots-search-input"
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
                <h2 className="ps-cartConfirmTitle">
                  Product added to cart successfully
                </h2>
                <p className="ps-cartConfirmText">
                  The product has been added to your cart. You can continue
                  shopping or proceed to checkout.
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
                <p
                  className="ps-pill"
                  style={{ margin: 0, width: "fit-content" }}
                >
                  Error
                </p>
                <h2 className="ps-cartConfirmTitle">
                  Unable to add product to cart
                </h2>
                <p className="ps-cartConfirmText">{cartErrorMessage}</p>
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

          {isAccessoriesCategory && (
            <div className="surfspots-accessory-row">
              {["All", "Leashes", "Surf Wax", "Fins"].map((item) => (
                <button
                  key={item}
                  onClick={() => setAccessoryFilter(item)}
                  className={`surfspots-accessory-button ${accessoryFilter === item ? "is-active" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <div id="products-grid" className="surfspots-grid">
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
                  <div key={productId} className="ps-productCard surfspots-product-card">
                    <div className="surfspots-product-media">
                      <button
                        type="button"
                        className="surfspots-product-image-button"
                        onClick={() => openPreview(product)}
                      >
                        <img
                          src={productImages[activeCardImageIndex]}
                          alt={product.name}
                          className="ps-productCardImage surfspots-product-image"
                        />
                      </button>

                      {productImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              goToCardImage(productId, productImages.length, -1)
                            }
                            className="surfspots-product-image-nav surfspots-product-image-nav-left"
                            aria-label="Previous product image"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              goToCardImage(productId, productImages.length, 1)
                            }
                            className="surfspots-product-image-nav surfspots-product-image-nav-right"
                            aria-label="Next product image"
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>
                    <div className="ps-dropBody surfspots-product-body">
                      <h3 className="ps-productCardTitle">{product.name}</h3>
                      <p className="ps-productCardDescription">
                        {product.description}
                      </p>
                      <p className="ps-productCardPrice">
                        <span className="surfspots-price-row">
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
              <p className="ps-previewDescription">
                {previewProduct.description || "No description available yet."}
              </p>
              <div className="ps-previewPurchaseRow surfspots-preview-purchase-row">
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
                    className="surfspots-preview-size-select"
                  >
                    <option value="">Select size</option>
                    {sizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                )}

                <div className="surfspots-preview-actions">
                  <button
                    type="button"
                    className="ps-btn ps-btn-primary surfspots-preview-action-button"
                    onClick={handlePreviewAddToCart}
                    disabled={
                      (previewProduct.stock ?? 0) < 1 ||
                      (isClothingProduct(previewProduct) && !previewSize)
                    }
                  >
                    {(previewProduct.stock ?? 0) < 1
                      ? "Out of Stock"
                      : "Add to Cart"}
                  </button>
                  <button
                    type="button"
                    className="ps-btn ps-btn-dark surfspots-preview-action-button"
                    onClick={handlePreviewBuyNow}
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
