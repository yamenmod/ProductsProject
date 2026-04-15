import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Home({ user, currentPage, onNavigate, onLogout, cartCount = 0 }) {
  const [recentProducts, setRecentProducts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [previewProduct, setPreviewProduct] = useState(null);
  const railRef = useRef(null);

  useEffect(() => {
    const loadRecentProducts = async () => {
      try {
        const response = await axios.get("/api/products");
        const sortedProducts = [...(response.data || [])].sort(
          (left, right) => {
            const leftDate = new Date(left.createdAt || 0).getTime();
            const rightDate = new Date(right.createdAt || 0).getTime();

            return rightDate - leftDate;
          },
        );

        setRecentProducts(sortedProducts.slice(0, 5));
      } catch (error) {
        setLoadError("Unable to load recent products.");
      }
    };

    loadRecentProducts();
  }, []);

  const featuredProducts = useMemo(
    () => recentProducts.slice(0, 5),
    [recentProducts],
  );

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

  const scrollRail = (direction) => {
    if (!railRef.current) {
      return;
    }

    railRef.current.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  };

  const closePreview = () => {
    setPreviewProduct(null);
  };

  return (
    <div className="ps-page">
      <Header
        user={user}
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

        <section className="ps-dropsSection">
          <div className="ps-shell ps-dropsLayout">
            <div className="ps-dropsIntro">
              <span className="ps-pill">New arrivals</span>
              <h2 className="ps-dropsTitle">Just Dropped</h2>
              <p className="ps-dropsText">Check the latest.</p>
              <button
                type="button"
                className="ps-dropsLink"
                onClick={() => onNavigate("products", "")}
              >
                Shop now &gt;
              </button>
            </div>

            <div className="ps-dropsRailWrap">
              <button
                type="button"
                className="ps-dropsArrow"
                onClick={() => scrollRail(-1)}
                aria-label="Scroll recent products left"
              >
                <span aria-hidden="true">‹</span>
              </button>

              <div className="ps-dropsRail" ref={railRef}>
                {featuredProducts.length > 0 ? (
                  featuredProducts.map((product) => (
                    <article
                      className="ps-dropCard"
                      key={product._id || product.id}
                    >
                      <button
                        type="button"
                        className="ps-dropImageWrap"
                        onClick={() => setPreviewProduct(product)}
                      >
                        <span className="ps-dropBadge">NEW</span>
                        <img
                          className="ps-dropImage"
                          src={resolveImageSrc(product.image)}
                          alt={product.name || "Recent product"}
                        />
                      </button>

                      <div className="ps-dropMetaRow">
                        <span className="ps-dropSwatch" />
                        <span className="ps-dropCategory">
                          {product.category || "Recent drop"}
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
                ) : loadError ? (
                  <div className="ps-dropsEmpty">{loadError}</div>
                ) : (
                  <div className="ps-dropsEmpty">Loading new drops...</div>
                )}
              </div>

              <button
                type="button"
                className="ps-dropsArrow"
                onClick={() => scrollRail(1)}
                aria-label="Scroll recent products right"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        </section>

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

            <img
              className="ps-previewImage"
              src={resolveImageSrc(previewProduct.image)}
              alt={previewProduct.name || "Product preview"}
            />

            <div className="ps-previewMeta">
              <span className="ps-previewBadge">NEW</span>
              <h3 className="ps-previewName">
                {previewProduct.name || "New product"}
              </h3>
              <p className="ps-previewCategory">
                {previewProduct.category || "Recent drop"}
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Home;
