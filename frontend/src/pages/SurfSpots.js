import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

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
  const [cart, setCart] = useState(cartItems || []);
  const [accessoryFilter, setAccessoryFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const swipeStartXRef = useRef(null);

  const loadProducts = async () => {
    const res = await axios.get("/api/products");
    setProducts(res.data);
  };

  useEffect(() => {
    const loadData = async () => {
      const [productsRes, cartRes] = await Promise.all([
        axios.get("/api/products"),
        axios.get("/api/cart", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }),
      ]);

      setProducts(productsRes.data);
      setCart(cartRes.data);
    };

    loadData();
  }, [session.token]);

  useEffect(() => {
    setActiveCategory(selectedCategory || "All");
  }, [selectedCategory]);

  useEffect(() => {
    setAccessoryFilter("All");
    if (activeCategory !== "All") {
      setSearchTerm("");
    }
  }, [activeCategory]);

  const handleAddToCart = async (productId) => {
    try {
      const res = await axios.post(
        "/api/cart",
        { productId, quantity: 1 },
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );
      setCart(res.data);
    } catch (requestError) {
      console.error("Add to cart failed:", requestError.message);
    }
  };

  const handlePreviewAddToCart = async () => {
    if (!previewProduct?._id) {
      return;
    }

    await handleAddToCart(previewProduct._id);
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

    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    if (imagePath.startsWith("/uploads/")) {
      return `http://localhost:5000${imagePath}`;
    }

    return imagePath;
  };

  const getProductImages = (product) => {
    const rawImages = Array.isArray(product?.image_urls)
      ? product.image_urls
      : Array.isArray(product?.imageUrls)
        ? product.imageUrls
        : product?.image
          ? [product.image]
          : [];

    const uniqueImages = [...new Set(rawImages.filter(Boolean))];

    return uniqueImages.length
      ? uniqueImages.map((imagePath) => resolveImageSrc(imagePath))
      : [resolveImageSrc("")];
  };

  const previewImages = useMemo(
    () => getProductImages(previewProduct),
    [previewProduct],
  );

  const openPreview = (product) => {
    setPreviewProduct(product);
    setPreviewImageIndex(0);
  };

  const closePreview = () => {
    setPreviewProduct(null);
    setPreviewImageIndex(0);
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

  return (
    <div className="ps-page">
      <Header
        user={session.user}
        preferredGender={preferredGender}
        onPreferredGenderChange={onPreferredGenderChange}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartItems?.length || 0}
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
              searchedProducts.map((product) => (
                <div
                  key={product._id}
                  style={{
                    border: "1px solid #e0cec0",
                    borderRadius: "14px",
                    overflow: "hidden",
                    background: "#fffbf5",
                    boxShadow: "0 12px 30px rgba(76, 56, 38, 0.1)",
                  }}
                >
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
                      src={resolveImageSrc(
                        product.image_urls?.[0] || product.image,
                      )}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "160px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </button>
                  <div style={{ padding: "14px" }}>
                    <h3 style={{ marginBottom: "8px", color: "#1f1813" }}>
                      {product.name}
                    </h3>
                    <p style={{ margin: "0 0 6px 0", color: "#5f5550" }}>
                      {product.description}
                    </p>
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontWeight: "700",
                        color: "#1f1813",
                      }}
                    >
                      ${Number(product.price).toFixed(2)}
                    </p>
                    <p style={{ margin: "0 0 6px 0", color: "#5f5550" }}>
                      Category: {product.category || "-"}
                    </p>
                    <p style={{ margin: "0 0 12px 0", color: "#5f5550" }}>
                      Stock: {product.stock ?? 0}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {(() => {
                        const isInCart = cart.some(
                          (item) => item.product?._id === product._id,
                        );

                        return (
                          <button
                            className="primary"
                            onClick={() => handleAddToCart(product._id)}
                            disabled={(product.stock ?? 0) < 1 || isInCart}
                          >
                            {(product.stock ?? 0) < 1
                              ? "Out of Stock"
                              : isInCart
                                ? "In Cart"
                                : "Add to Cart"}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))
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
              <p className="ps-previewCategory">
                {previewProduct.category || "Product"}
              </p>
              <p className="ps-previewDescription">
                {previewProduct.description || "No description available yet."}
              </p>

              <div className="ps-previewPurchaseRow">
                <div>
                  <p className="ps-previewPrice">
                    {Number.isFinite(Number(previewProduct.price))
                      ? `$${Number(previewProduct.price).toFixed(2)}`
                      : "View price"}
                  </p>
                  <p className="ps-previewStock">
                    Stock: {previewProduct.stock ?? 0}
                  </p>
                </div>

                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={handlePreviewAddToCart}
                  disabled={(previewProduct.stock ?? 0) < 1}
                >
                  {(previewProduct.stock ?? 0) < 1
                    ? "Out of Stock"
                    : "Add to Cart"}
                </button>
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
