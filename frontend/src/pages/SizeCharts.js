import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

const menSizeChartRows = [
  ["XS", "5'6\"-5'8\"", "120-135", '34"-36"', '28"-30"', '21"', '25.5"'],
  ["S", "5'7\"-5'9\"", "135-155", '36"-38"', '29"-31"', '21.25"', '26.75"'],
  ["MS", "5'7\"-5'9\"", "150-170", '38"-40"', '30"-32"', '21.25"', '26.75"'],
  ["M", "5'9\"-5'11\"", "150-170", '38"-40"', '30"-32"', '22"', '28"'],
  ["MT", "5'11\"-6'1\"", "160-180", '38"-40"', '30"-32"', '22.5"', '29"'],
  ["LS", "5'9\"-5'11\"", "170-190", '40"-42"', '32"-34"', '22"', '28"'],
  ["L", "5'11\"-6'1\"", "170-190", '40"-42"', '32"-34"', '22.5"', '29"'],
  ["LT", "6'1\"-6'3\"", "180-200", '40"-42"', '32"-34"', '23"', '30.25"'],
  ["XLS", "5'11\"-6'1\"", "190-210", '42"-44"', '34"-36"', '22.5"', '29"'],
  ["XL", "6'1\"-6'3\"", "190-210", '42"-44"', '34"-36"', '23"', '30.25"'],
  ["XLT", "6'4\"-6'6\"", "200-220", '42"-44"', '34"-36"', '23"', '32.5"'],
  ["2XL", "6'2\"-6'4\"", "210-230", '44"-46"', '36"-38"', '24"', '31.5"'],
  ["3XL", "6'2\"-6'4\"", "230-250", '46"-48"', '38"-42"', '24"', '31.5"'],
];

const womenSizeChartRows = [
  ["4", "5'0\"-5'3\"", "90-110", '30"-32"', '23"-25"', '19"', '26"'],
  ["6", "5'2\"-5'5\"", "100-120", '31"-33"', '24"-26"', '19.5"', '27"'],
  ["8", "5'4\"-5'6\"", "110-130", '32"-34"', '25"-27"', '20"', '28"'],
  ["8T", "5'6\"-5'8\"", "115-135", '32"-34"', '25"-28"', '21"', '30"'],
  ["10", "5'6\"-5'8\"", "120-140", '34"-36"', '26"-28"', '20"', '29"'],
  ["10T", "5'7\"-5'9\"", "125-145", '34"-36"', '26"-28"', '21.5"', '30"'],
  ["12", "5'7\"-5'9\"", "130-155", '36"-38"', '28"-30"', '21"', '29.5"'],
  ["14", "5'9\"-5'11\"", "145-165", '38"-40"', '29"-31"', '21.5"', '31"'],
];

function SizeCharts({
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
  const [products, setProducts] = useState([]);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const swipeStartXRef = useRef(null);

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

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await axios.get("/api/products");
        setProducts(response.data || []);
      } catch (error) {
        setProducts([]);
      }
    };

    loadProducts();
  }, []);

  const wetsuitProducts = useMemo(
    () =>
      products
        .filter(
          (product) =>
            (product.category || "").toString().trim().toLowerCase() ===
              "wetsuits" && canViewProduct(product),
        )
        .slice(0, 4),
    [products, preferredGender],
  );

  const resolveImageSrc = (imagePath) => {
    if (!imagePath) {
      return "https://via.placeholder.com/420x520?text=Wetsuit";
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

  const handleAddToCart = async (product) => {
    if (!session?.token || !product?._id) {
      return;
    }

    try {
      await axios.post(
        "/api/cart",
        { productId: product._id, quantity: 1 },
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );

      if (typeof onAddToCart === "function") {
        onAddToCart(product);
      }
    } catch (error) {
      console.error("Add to cart failed:", error.message);
    }
  };

  const renderChartTable = (rows, columns) => (
    <div className="ps-sizeChartTableWrap">
      <table className="ps-sizeChartTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => (
                <td key={cell}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const handlePreviewAddToCart = async () => {
    if (!previewProduct) {
      return;
    }

    await handleAddToCart(previewProduct);
    closePreview();
  };

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

      <main className="ps-main ps-sizeChartsPage">
        <section className="ps-shell ps-sizeChartsHero">
          <div>
            <h1 className="ps-sizeChartsTitle">
              MEN&apos;S WETSUIT SIZE CHART
            </h1>
            <p className="ps-sizeChartsLead">
              Rip Curl men&apos;s wetsuits come in standard and tall (T)
              variants: ST, MT, and LT. If you run long through the torso or
              legs within a size range, the tall cut gives you extra length so
              the suit seals correctly at the ankles and wrists.
            </p>
          </div>

          <div className="ps-sizeChartsActions">
            <button
              type="button"
              className="ps-btn ps-btn-secondary"
              onClick={() => onNavigate("shop")}
            >
              Back to Shop
            </button>
          </div>
        </section>

        <section className="ps-shell ps-sizeChartPanel">
          <div className="ps-sizeChartMeta">
            <h2 className="ps-sizeChartPanelTitle">MEN&apos;S WETSUITS</h2>
            <p className="ps-sizeChartNote">
              Please note: sizing is listed in inches (Imperial Measurement)
            </p>
          </div>

          {renderChartTable(menSizeChartRows, [
            "Size",
            "Height",
            "Weight",
            "Chest",
            "Waist",
            "Body Length",
            "Leg Length",
          ])}
        </section>

        <section className="ps-shell ps-sizeChartsHero ps-sizeChartsHeroWomen">
          <div>
            <h1 className="ps-sizeChartsTitle">
              WOMEN&apos;S WETSUIT SIZE CHART
            </h1>
            <p className="ps-sizeChartsLead">
              Rip Curl women&apos;s wetsuits are cut for the female form and are
              built to fit at the bust and hips, with narrower shoulders than
              men&apos;s patterns. Sizing into a men&apos;s suit means panels
              that don&apos;t align with your body, which directly translates to
              heat loss and restricted mobility.
            </p>
          </div>
        </section>

        <section className="ps-shell ps-sizeChartPanel">
          <div className="ps-sizeChartMeta">
            <h2 className="ps-sizeChartPanelTitle">
              WOMEN&apos;S WETSUITS &amp; RASH VESTS
            </h2>
            <p className="ps-sizeChartNote">
              Please note: sizing is listed in inches (Imperial Measurement)
            </p>
          </div>

          {renderChartTable(womenSizeChartRows, [
            "Size",
            "Height",
            "Weight",
            "Chest",
            "Waist",
            "Arm Length",
            "Leg Length",
          ])}
        </section>

        <section className="ps-shell ps-sizeChartProducts">
          <div className="ps-sizeChartProductsHeader">
            <div>
              <p className="ps-sizeChartTag">Wetsuits</p>
              <h2 className="ps-sizeChartProductsTitle">Shop the lineup</h2>
              <p className="ps-sizeChartProductsLead">
                Explore the wetsuits that match the Rip Curl sizing guide.
              </p>
            </div>

            <button
              type="button"
              className="ps-btn ps-btn-primary"
              onClick={() => onNavigate("products", "wetsuits")}
            >
              View All Wetsuits
            </button>
          </div>

          <div className="ps-sizeChartProductGrid">
            {wetsuitProducts.length > 0 ? (
              wetsuitProducts.map((product) => (
                <article
                  key={product._id || product.id}
                  className="ps-sizeChartProductCard ps-surface"
                >
                  <button
                    type="button"
                    className="ps-sizeChartProductImageWrap"
                    onClick={() => openPreview(product)}
                  >
                    <img
                      className="ps-sizeChartProductImage"
                      src={resolveImageSrc(
                        product.image_urls?.[0] || product.image,
                      )}
                      alt={product.name || "Wetsuit"}
                    />
                  </button>

                  <div className="ps-sizeChartProductBody">
                    <p className="ps-sizeChartProductCategory">
                      Rip Curl Wetsuit
                    </p>
                    <h3 className="ps-sizeChartProductName">
                      {product.name || "Wetsuit"}
                    </h3>
                    <button
                      type="button"
                      className="ps-sizeChartAddButton"
                      onClick={() => handleAddToCart(product)}
                    >
                      <img
                        src="/CartLogo/AddToCartLogo.png"
                        alt="Add to cart"
                        className="ps-sizeChartAddIcon"
                      />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="ps-dropsEmpty">No wetsuits available yet.</div>
            )}
          </div>
        </section>
      </main>

      {previewProduct && (
        <div className="ps-previewBackdrop" onClick={closePreview}>
          <div
            className="ps-previewCard ps-sizeChartPreviewCard"
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
            </div>

            <div className="ps-previewMeta">
              <span className="ps-previewBadge">WETSUIT</span>
              <h3 className="ps-previewName">
                {previewProduct.name || "Wetsuit"}
              </h3>
              <p className="ps-previewCategory">
                {previewProduct.category || "Rip Curl Wetsuit"}
              </p>
              <p className="ps-previewDescription">
                {previewProduct.description ||
                  "Premium wetsuit built for surf sessions."}
              </p>

              {previewImages.length > 1 && (
                <div className="ps-previewThumbs" aria-label="Product images">
                  {previewImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      className={
                        index === previewImageIndex
                          ? "ps-previewThumb is-active"
                          : "ps-previewThumb"
                      }
                      onClick={() => setPreviewImageIndex(index)}
                      aria-label={`Show image ${index + 1} of ${previewImages.length}`}
                    >
                      <img src={image} alt="Wetsuit thumbnail" />
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="ps-sizeChartAddButton ps-sizeChartAddButtonModal"
                onClick={handlePreviewAddToCart}
              >
                <img
                  src="/CartLogo/AddToCartLogo.png"
                  alt="Add to cart"
                  className="ps-sizeChartAddIcon"
                />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default SizeCharts;
