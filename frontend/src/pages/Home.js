import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

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
  const [loadError, setLoadError] = useState("");
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const surfboardRailRef = useRef(null);
  const wetsuitRailRef = useRef(null);
  const swipeStartXRef = useRef(null);

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
        setLoadError("Unable to load recent surfboards.");
      }
    };

    loadRecentProducts();
  }, []);

  const surfboardProducts = useMemo(
    () =>
      recentProducts.filter(
        (product) =>
          normalizeCategoryValue(product.category) === "surfboards" &&
          canViewProduct(product),
      ),
    [recentProducts, preferredGender],
  );

  const wetsuitProducts = useMemo(
    () =>
      recentProducts.filter(
        (product) =>
          normalizeCategoryValue(product.category) === "wetsuits" &&
          canViewProduct(product),
      ),
    [recentProducts, preferredGender],
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

  const handlePreviewAddToCart = async () => {
    if (!previewProduct || !session?.token) {
      return;
    }

    try {
      await axios.post(
        "/api/cart",
        { productId: previewProduct._id || previewProduct.id, quantity: 1 },
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );

      if (typeof onAddToCart === "function") {
        onAddToCart(previewProduct);
      }
    } catch (error) {
      console.error("Add to cart from home failed:", error.message);
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
              products.map((product) => (
                <article
                  className="ps-dropCard"
                  key={product._id || product.id}
                >
                  <button
                    type="button"
                    className="ps-dropImageWrap"
                    onClick={() => openPreview(product)}
                  >
                    <span className="ps-dropBadge">NEW</span>
                    <img
                      className="ps-dropImage"
                      src={resolveImageSrc(
                        product.image_urls?.[0] || product.image,
                      )}
                      alt={product.name || "Recent product"}
                    />
                  </button>

                  <div className="ps-dropMetaRow">
                    <span className="ps-dropSwatch" />
                    <span className="ps-dropCategory">
                      {product.category || pill}
                    </span>
                  </div>

                  <h3 className="ps-dropName">
                    {product.name || "New product"}
                  </h3>
                  <p className="ps-dropPrice">
                    {Number.isFinite(Number(product.price))
                      ? `$${Number(product.price).toFixed(2)}`
                      : "View price"}
                  </p>
                </article>
              ))
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

      <main className="ps-main">
        <section className="ps-home-hero">
          <video autoPlay muted loop playsInline className="ps-home-video">
            <source src="/VideoGif/SurfingGif.mp4" type="video/mp4" />
          </video>

          <div className="ps-home-heroOverlay" />

          <div className="ps-home-heroContent">
            <h1 className="ps-home-heroTitle"></h1>

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
              <p className="ps-previewCategory">
                {previewProduct.category || "Recent surfboard"}
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

export default Home;
