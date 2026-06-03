import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Assistant from "../components/Assistant";

function Home({
  user,
  session,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onAddToCart,
  onLogout,
  cartCount = 0,
}) {
  const [recentProducts, setRecentProducts] = useState([]);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewSize, setPreviewSize] = useState("");
  const [cardImageIndices, setCardImageIndices] = useState({});
  const [cartErrorMessage, setCartErrorMessage] = useState("");
  const [showBulkOrderCTA, setShowBulkOrderCTA] = useState(false);
  const surfboardRailRef = useRef(null);
  const wetsuitRailRef = useRef(null);
  const swipeStartXRef = useRef(null);

  const sizeOptions = ["S", "M", "L", "XL", "XXL"];

  const normalizeCategoryValue = (value) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const normalizeGenderValue = (value) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const isClothingProduct = (product) => {
    const normalized = normalizeGenderValue(product?.category);
    return normalized.includes("clothing") || normalized.includes("wetsuit");
  };

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

  const resolveImageSrc = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/520x640?text=New+Drop";
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

  useEffect(() => {
    const loadRecentProducts = async () => {
      try {
        const response = await axios.get("/api/products");
        const sortedProducts = [...(response.data || [])].sort(
          (left, right) => {
            const leftDate = new Date(
              left.createdAt || left.created_at || 0,
            ).getTime();
            const rightDate = new Date(
              right.createdAt || right.created_at || 0,
            ).getTime();

            return rightDate - leftDate;
          },
        );

        setRecentProducts(sortedProducts.slice(0, 12));
      } catch (error) {
        console.error("Unable to load recent products:", error.message);
      }
    };

    loadRecentProducts();
  }, []);

  const surfboardProducts = recentProducts.filter(
    (product) =>
      normalizeCategoryValue(product.category) === "surfboards" &&
      canViewProduct(product),
  );

  const wetsuitProducts = recentProducts.filter(
    (product) =>
      normalizeCategoryValue(product.category) === "wetsuits" &&
      canViewProduct(product),
  );

  const scrollRail = (railElement, direction) => {
    if (!railElement?.current) {
      return;
    }

    railElement.current.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  };

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

  const addProductToCart = async (product, size = "") => {
    if (!product || !session?.token) {
      return false;
    }

    const productId = product.id || product._id;

    if (!productId) {
      return false;
    }

    try {
      const response = await axios.post(
        "/api/cart",
        { productId, quantity: 1, size: size || "" },
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
            "X-Source-Page": "home",
          },
        },
      );

      if (typeof onAddToCart === "function") {
        await onAddToCart(response.data);
      }

      setCartErrorMessage("");
      setShowBulkOrderCTA(false);
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error("Home add to cart failed:", errorMsg);
      setCartErrorMessage(errorMsg);
      setShowBulkOrderCTA(errorMsg.includes("bulk orders"));
      return false;
    }
  };

  const handlePreviewAddToCart = async () => {
    if (!previewProduct) {
      return;
    }

    const selectedSize = isClothingProduct(previewProduct) ? previewSize : "";
    const added = await addProductToCart(previewProduct, selectedSize);
    if (added) {
      onNavigate("cart");
    }
  };

  const handlePreviewBuyNow = async () => {
    if (!previewProduct) {
      return;
    }

    const selectedSize = isClothingProduct(previewProduct) ? previewSize : "";
    const added = await addProductToCart(previewProduct, selectedSize);
    if (!added) {
      return;
    }

    onNavigate("cart");
    closePreview();
  };

  const handleCardAddToCart = async (product) => {
    if (!product) {
      return;
    }

    const added = await addProductToCart(product);
    if (added) {
      onNavigate("cart");
    }
  };

  const renderRecentSection = ({
    title,
    pill,
    description,
    products,
    categorySlug,
    railRef,
  }) => (
    <section className="ps-dropsSection">
      <div className="ps-shell ps-dropsLayout">
        <div className="ps-dropsIntro">
          <span className="ps-pill">{pill}</span>
          <h2 className="ps-dropsTitle">{title}</h2>
          <p className="ps-dropsText">{description}</p>
          <button
            type="button"
            className="ps-dropsLink"
            onClick={() => onNavigate("products", categorySlug)}
          >
            Shop now &gt;
          </button>
        </div>

        <div className="ps-dropsRailWrap">
          <button
            type="button"
            className="ps-dropsArrow"
            onClick={() => scrollRail(railRef, -1)}
            aria-label={`Scroll ${categorySlug} products left`}
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="ps-dropsRail" ref={railRef}>
            {products.length > 0 ? (
              products.map((product) => {
                const productImages = getProductImages(product);
                const productId = product._id || product.id;
                const activeCardImageIndex = cardImageIndices[productId] || 0;

                return (
                  <article className="ps-dropCard" key={productId}>
                    <div
                      className="ps-dropImageWrap"
                      style={{ position: "relative" }}
                    >
                      <button
                        type="button"
                        style={{
                          border: 0,
                          padding: 0,
                          background: "transparent",
                          width: "100%",
                          cursor: "pointer",
                        }}
                        onClick={() => openPreview(product)}
                      >
                        <span className="ps-dropBadge">NEW</span>
                        <img
                          className="ps-dropImage"
                          src={productImages[activeCardImageIndex]}
                          alt={product.name || "Recent product"}
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
                              left: "10px",
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
                              zIndex: 2,
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
                              right: "10px",
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
                              zIndex: 2,
                            }}
                            aria-label="Next product image"
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>

                    <div className="ps-dropBody">
                      <div className="ps-dropMetaRow">
                        <span className="ps-dropSwatch" />
                        <span className="ps-dropCategory">
                          {product.category || pill}
                        </span>
                      </div>

                      <h3 className="ps-dropName">
                        {product.name || "New product"}
                      </h3>

                      <div
                        className="ps-dropPrice"
                        style={{ display: "grid", gap: "2px" }}
                      >
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: 800,
                            color: "#1f1813",
                          }}
                        >
                          ${(product.price ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ps-btn ps-btn-primary"
                        style={{
                          width: "100%",
                          fontSize: "12px",
                          marginTop: "12px",
                        }}
                        onClick={() =>
                          isClothingProduct(product)
                            ? openPreview(product)
                            : handleCardAddToCart(product)
                        }
                        disabled={(product.stock ?? 0) < 1}
                      >
                        {(product.stock ?? 0) < 1
                          ? "Out of Stock"
                          : "Add to Cart"}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="ps-dropsEmpty">No {pill.toLowerCase()} yet.</div>
            )}
          </div>

          <button
            type="button"
            className="ps-dropsArrow"
            onClick={() => scrollRail(railRef, 1)}
            aria-label={`Scroll ${categorySlug} products right`}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </section>
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

      {cartErrorMessage && (
        <div
          style={{
            maxWidth: "1200px",
            margin: "20px auto",
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
                setCartErrorMessage("");
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

      <main className="ps-main">
        <section className="ps-home-hero">
          <video autoPlay muted loop playsInline className="ps-home-video">
            <source src="/VideoGif/SurfingGif.mp4" type="video/mp4" />
          </video>

          <div className="ps-home-heroOverlay" />

          <div className="ps-home-heroContent">
            <h1 className="ps-home-heroTitle">Plage Surf</h1>

            <p className="ps-home-heroKicker">New Collection</p>

            <button
              type="button"
              onClick={() => onNavigate("products", "")}
              className="ps-btn ps-home-heroButton"
            >
              Shop now
            </button>
          </div>
        </section>

        {renderRecentSection({
          title: "Just Dropped",
          pill: "New arrivals",
          description: "Check the latest.",
          products: surfboardProducts,
          categorySlug: "surfboards",
          railRef: surfboardRailRef,
        })}

        <section className="ps-home-wetsuitPromo">
          <img
            src="/WetsuitHomePage/WestuitImage.jpeg"
            alt="Wetsuit collection"
            className="ps-home-wetsuitImage"
          />
          <div className="ps-home-wetsuitOverlay" />

          <div className="ps-home-wetsuitContent">
            <p className="ps-home-heroKicker">New Collection</p>
            <button
              type="button"
              onClick={() => onNavigate("products", "wetsuits")}
              className="ps-btn ps-home-heroButton"
            >
              Shop now
            </button>
          </div>
        </section>

        {renderRecentSection({
          title: "Just Dropped",
          pill: "Wetsuits",
          description: "Fresh wetsuits ready for colder sessions.",
          products: wetsuitProducts,
          categorySlug: "wetsuits",
          railRef: wetsuitRailRef,
        })}
      </main>

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
                        fontSize: "22px",
                        fontWeight: 800,
                        color: "#1f1813",
                      }}
                    >
                      ${(previewProduct.price ?? 0).toFixed(2)}
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
                    disabled={
                      (previewProduct.stock ?? 0) < 1 ||
                      (isClothingProduct(previewProduct) && !previewSize)
                    }
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
      <Assistant session={session} user={user} />
    </div>
  );
}

export default Home;
