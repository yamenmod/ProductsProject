/**
 * Manage Products Page
 * Admin-only page for creating, editing, and deleting products
 * Features form validation, size stock management, and image handling
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

function ManageProducts({
  session,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
  initialProductToEdit,
}) {
  const [products, setProducts] = useState([]);
  const createDefaultSizeStock = () => ({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    gender: "unisex",
    size: "",
    image: "",
    image_urls: [],
    stock: "",
    maxQuantityPerUser: "",
    sizeStock: createDefaultSizeStock(),
    boardHeight: "",
    boardVolume: "",
  });
  const [editId, setEditId] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const [cardImageIndices, setCardImageIndices] = useState({});
  const [selectedImagePreviewUrls, setSelectedImagePreviewUrls] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const fileInputRef = React.useRef(null);

  // Generate height options from 4.0 to 10.0 in 0.1 increments, plus specific inch values
  const heightOptions = [];
  for (let feet = 4; feet <= 10; feet++) {
    for (let inches = 0; inches <= 11; inches++) {
      if (inches === 0) {
        heightOptions.push(`${feet}.0`);
      } else {
        heightOptions.push(`${feet}.${inches}`);
      }
    }
  }

  // Generate volume options from 10 to 150
  const volumeOptions = [];
  for (let i = 10; i <= 150; i++) {
    volumeOptions.push(i.toString());
  }

  const sizeOptions = ["S", "M", "L", "XL", "XXL"];

  const formatSizeStock = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object") {
      return Object.entries(value)
        .map(([size, stock]) => `${size}:${stock}`)
        .join(", ");
    }

    return "";
  };

  const parseSizeStockValue = (value) => {
    const result = createDefaultSizeStock();

    if (!value) {
      return result;
    }

    let source = value;

    if (typeof source === "string") {
      const trimmed = source.trim();
      if (!trimmed) {
        return result;
      }

      try {
        source = JSON.parse(trimmed);
      } catch {
        source = trimmed
          .split(/[;,\n]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .reduce((acc, item) => {
            const separatorIndex = item.indexOf(":");
            if (separatorIndex === -1) {
              return acc;
            }
            const key = item.slice(0, separatorIndex).trim().toUpperCase();
            const stock = Number(item.slice(separatorIndex + 1).trim());
            if (!key || Number.isNaN(stock) || stock < 0) {
              return acc;
            }
            acc[key] = Math.floor(stock);
            return acc;
          }, {});
      }
    }

    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return result;
    }

    return sizeOptions.reduce((next, size) => {
      const rawValue =
        source[size] ??
        source[size.toLowerCase()] ??
        source[size.toUpperCase()];
      const stockValue = Number(rawValue);
      next[size] =
        Number.isFinite(stockValue) && stockValue >= 0
          ? Math.floor(stockValue)
          : 0;
      return next;
    }, {});
  };

  const isClothingCategory = (value) => {
    const normalized = (value || "").toString().trim().toLowerCase();
    return normalized.includes("clothing") || normalized.includes("wetsuit");
  };

  const normalizeGenderValue = (value) => {
    const normalized = (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "");

    if (
      normalized === "female" ||
      normalized === "women" ||
      normalized === "womens"
    ) {
      return "female";
    }

    if (
      normalized === "male" ||
      normalized === "men" ||
      normalized === "mens"
    ) {
      return "male";
    }

    return "unisex";
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

  const loadProducts = async () => {
    try {
      const res = await axios.get("/api/products");
      setProducts(res.data);
    } catch (err) {
      setError("Failed to load products");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const nextUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setSelectedImagePreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      category: "",
      gender: "unisex",
      size: "",
      image: "",
      image_urls: [],
      stock: "",
      maxQuantityPerUser: "",
      sizeStock: createDefaultSizeStock(),
      boardHeight: "",
      boardVolume: "",
    });
    setImageFiles([]);
    setEditId(null);
    setShowForm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || form.price === "") {
      setError("Name and price are required.");
      return;
    }

    // Validate surfboard-specific fields
    if ((form.category || "").toLowerCase().includes("surfboard")) {
      if (form.boardHeight !== "") {
        const height = Number(form.boardHeight);
        if (height < 4.0 || height > 10.11) {
          setError("Board feet must be between 4'0\" and 10'11\".");
          return;
        }
      }
      if (form.boardVolume !== "") {
        const volume = Number(form.boardVolume);
        if (volume <= 0) {
          setError("Board volume must be greater than 0 liters.");
          return;
        }
      }
    }

    if (isClothingCategory(form.category)) {
      const hasValidSizeStock = Object.values(form.sizeStock || {}).every(
        (stock) => Number.isFinite(Number(stock)) && Number(stock) >= 0,
      );

      if (!hasValidSizeStock) {
        setError(
          "Enter valid stock values for clothing sizes using the fixed size grid.",
        );
        return;
      }
    }

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("description", form.description.trim());
    payload.append("price", Number(form.price));
    payload.append("category", form.category.trim());
    payload.append("gender", normalizeGenderValue(form.gender));
    payload.append("stock", String(form.stock === "" ? 0 : Number(form.stock)));
    payload.append(
      "maxQuantityPerUser",
      form.maxQuantityPerUser === "" ? 10 : Number(form.maxQuantityPerUser),
    );

    if (isClothingCategory(form.category) && form.size) {
      payload.append("size", form.size);
    }

    if (isClothingCategory(form.category)) {
      payload.append("sizeStock", JSON.stringify(form.sizeStock));
    }

    // Add surfboard-specific fields if category is Surfboard
    if ((form.category || "").toLowerCase().includes("surfboard")) {
      if (form.boardHeight !== "") {
        payload.append("boardHeight", Number(form.boardHeight));
      }
      if (form.boardVolume !== "") {
        payload.append("boardVolume", Number(form.boardVolume));
      }
    }

    if (editId) {
      payload.append("images", JSON.stringify(form.image_urls || []));
    }

    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        payload.append("image", file);
      });
    } else if (
      !editId &&
      Array.isArray(form.image_urls) &&
      form.image_urls.length > 0
    ) {
      payload.append("images", JSON.stringify(form.image_urls));
    } else if (!editId && form.image) {
      payload.append("image", form.image.trim());
    }

    try {
      if (editId) {
        await axios.put(`/api/products/${editId}`, payload, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          timeout: 120000, // 2 minutes timeout
        });
        setSuccess("Product updated");
      } else {
        await axios.post("/api/products", payload, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
          timeout: 120000, // 2 minutes timeout
        });
        setSuccess("Product added");
      }

      resetForm();
      loadProducts();
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Request failed",
      );
    }
  };

  const handleEdit = (product) => {
    const existingImages = [
      ...parseImageValue(product.image_urls),
      ...parseImageValue(product.imageUrls),
      ...parseImageValue(product.image_url),
      ...parseImageValue(product.image),
    ].filter(Boolean);

    const uniqueExistingImages = [...new Set(existingImages)];

    const productId = product._id || product.id;

    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      category: product.category || "",
      gender: normalizeGenderValue(product.gender),
      size: product.size || "",
      image: product.image || "",
      image_urls: uniqueExistingImages,
      stock: Number(product.stock) ?? 0,
      maxQuantityPerUser: product.max_quantity_per_user ?? 10,
      sizeStock: parseSizeStockValue(
        product.sizeStock || product.size_stock || {},
      ),
      boardHeight: product.boardHeight ?? product.height ?? "",
      boardVolume: product.boardVolume ?? product.volume ?? "",
    });
    setImageFiles([]);
    setEditId(productId);
    setShowForm(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (initialProductToEdit && typeof initialProductToEdit === "object") {
      handleEdit(initialProductToEdit);
    }
    // handleEdit is intentionally omitted to avoid retriggering edit mode
    // on each render when function identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductToEdit]);

  const handleDelete = async (id) => {
    setSuccess("");
    try {
      await axios.delete(`/api/products/${id}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      loadProducts();
      setSuccess("Product deleted");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Delete failed");
    } finally {
      setProductToDelete(null);
    }
  };

  const handleRemoveCurrentImage = (indexToRemove) => {
    setForm((previousForm) => ({
      ...previousForm,
      image_urls: (previousForm.image_urls || []).filter(
        (_, index) => index !== indexToRemove,
      ),
    }));
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setImageFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove),
    );
  };

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
  };

  const closePreview = () => {
    setPreviewProduct(null);
    setPreviewImageIndex(0);
    setSwipeStartX(null);
  };

  const goToPreviewImage = (nextIndex) => {
    if (!previewImages.length) {
      return;
    }

    const safeIndex = (nextIndex + previewImages.length) % previewImages.length;
    setPreviewImageIndex(safeIndex);
  };

  const handlePreviewTouchStart = (event) => {
    setSwipeStartX(event.touches[0]?.clientX ?? null);
  };

  const handlePreviewTouchEnd = (event) => {
    const endX = event.changedTouches[0]?.clientX;

    if (swipeStartX === null || endX === undefined) {
      return;
    }

    const swipeDistance = swipeStartX - endX;
    const swipeThreshold = 40;

    if (swipeDistance > swipeThreshold) {
      goToPreviewImage(previewImageIndex + 1);
    } else if (swipeDistance < -swipeThreshold) {
      goToPreviewImage(previewImageIndex - 1);
    }

    setSwipeStartX(null);
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

  const categories = [
    "All",
    "Surfboards",
    "Wetsuits",
    "Clothing",
    "Surfboard Accessories",
  ];

  const visibleProducts = products.filter((product) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      ? true
      : (product.name || "")
          .toString()
          .toLowerCase()
          .includes(normalizedSearch);

    const normalizedCategory = (product.category || "")
      .toString()
      .trim()
      .toLowerCase();
    const matchesCategory =
      categoryFilter === "all" ? true : normalizedCategory === categoryFilter;

    return matchesSearch && matchesCategory;
  });

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
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "40px",
            background: "rgba(255, 250, 242, 0.84)",
            border: "1px solid rgba(31, 24, 19, 0.08)",
            borderRadius: "22px",
            boxShadow: "0 18px 42px rgba(67, 48, 33, 0.12)",
            fontFamily: "Manrope, 'Segoe UI', sans-serif",
            fontSize: "13px",
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
                fontSize: "36px",
                margin: "0 0 8px 0",
                letterSpacing: "1px",
                lineHeight: 0.9,
              }}
            >
              Manage Products
            </h2>
            <p
              style={{
                margin: "0",
                color: "#65574d",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Create, edit, and delete products from your inventory
            </p>
          </div>

          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #d7a495",
                color: "#8b3529",
                background: "#fff0ec",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #acd5b0",
                color: "#2f6e3f",
                background: "#eff9f0",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              ✓ {success}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products by name"
              style={{
                minWidth: "260px",
                flex: "1 1 260px",
                padding: "12px 14px",
                border: "1px solid #d9c3ad",
                borderRadius: "12px",
                background: "#fffdf8",
                fontSize: "13px",
              }}
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={{
                minWidth: "240px",
                padding: "12px 14px",
                border: "1px solid #d9c3ad",
                borderRadius: "12px",
                background: "#fffdf8",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <option value="all">All categories</option>
              {categories.slice(1).map((category) => (
                <option key={category} value={category.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                resetForm();
              }
            }}
            style={{
              marginBottom: "24px",
              padding: "12px 24px",
              background: "linear-gradient(135deg, #245860, #2f747d)",
              color: "#fff",
              border: "0",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "14px",
              transition: "transform 180ms ease, box-shadow 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 12px 28px rgba(36, 88, 96, 0.24)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            {showForm ? "Cancel" : "+ Add New Product"}
          </button>

          {showForm && (
            <div
              style={{
                marginBottom: "32px",
                padding: "24px",
                background: "#faf8f4",
                border: "1px solid #e0cec0",
                borderRadius: "12px",
              }}
            >
              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Product Name *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d9c3ad",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      transition: "all 0.2s ease",
                      background: "#fffdf8",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#245860";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(36, 88, 96, 0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d9c3ad";
                      e.target.style.boxShadow = "none";
                    }}
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price (number) *"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d9c3ad",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      transition: "all 0.2s ease",
                      background: "#fffdf8",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#245860";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(36, 88, 96, 0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d9c3ad";
                      e.target.style.boxShadow = "none";
                    }}
                  />

                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d9c3ad",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      background: "#fffdf8",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.slice(1).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d9c3ad",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      background: "#fffdf8",
                      cursor: "pointer",
                    }}
                  >
                    <option value="unisex">Unisex</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    placeholder="Stock"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d9c3ad",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      transition: "all 0.2s ease",
                      background: "#fffdf8",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#245860";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(36, 88, 96, 0.12)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d9c3ad";
                      e.target.style.boxShadow = "none";
                    }}
                  />

                  {isClothingCategory(form.category) && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: "12px",
                        marginTop: "8px",
                      }}
                    >
                      {sizeOptions.map((size) => (
                        <label
                          key={size}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            background: "#fffdf8",
                            border: "1px solid #d9c3ad",
                            borderRadius: "10px",
                            padding: "12px",
                            fontSize: "13px",
                            color: "#1f1813",
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>{size}</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.sizeStock[size] ?? 0}
                            onChange={(e) => {
                              const nextValue = Number(e.target.value);
                              setForm({
                                ...form,
                                sizeStock: {
                                  ...form.sizeStock,
                                  [size]:
                                    Number.isFinite(nextValue) && nextValue >= 0
                                      ? Math.floor(nextValue)
                                      : 0,
                                },
                              });
                            }}
                            style={{
                              padding: "10px 12px",
                              border: "1px solid #d9c3ad",
                              borderRadius: "8px",
                              fontSize: "13px",
                              fontFamily: "inherit",
                              background: "#fffdf8",
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  {(form.category || "")
                    .toLowerCase()
                    .includes("surfboard") && (
                    <>
                      <select
                        value={form.boardHeight}
                        onChange={(e) =>
                          setForm({ ...form, boardHeight: e.target.value })
                        }
                        style={{
                          padding: "10px 12px",
                          border: "1px solid #d9c3ad",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          transition: "all 0.2s ease",
                          background: "#fffdf8",
                          width: "100%",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#245860";
                          e.target.style.boxShadow =
                            "0 0 0 3px rgba(36, 88, 96, 0.12)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#d9c3ad";
                          e.target.style.boxShadow = "none";
                        }}
                      >
                        <option value="">Select Board Feet</option>
                        {heightOptions.map((height) => {
                          const [feet, inches] = height.split(".");
                          return (
                            <option key={height} value={height}>
                              {feet}'{inches}"
                            </option>
                          );
                        })}
                      </select>

                      <select
                        value={form.boardVolume}
                        onChange={(e) =>
                          setForm({ ...form, boardVolume: e.target.value })
                        }
                        style={{
                          padding: "10px 12px",
                          border: "1px solid #d9c3ad",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          transition: "all 0.2s ease",
                          background: "#fffdf8",
                          width: "100%",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#245860";
                          e.target.style.boxShadow =
                            "0 0 0 3px rgba(36, 88, 96, 0.12)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#d9c3ad";
                          e.target.style.boxShadow = "none";
                        }}
                      >
                        <option value="">Select Board Volume</option>
                        {volumeOptions.map((volume) => (
                          <option key={volume} value={volume}>
                            {volume} L
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #d9c3ad",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    background: "#fffdf8",
                    width: "100%",
                    minHeight: "80px",
                    marginBottom: "16px",
                    resize: "vertical",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#245860";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(36, 88, 96, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d9c3ad";
                    e.target.style.boxShadow = "none";
                  }}
                />

                <div style={{ marginBottom: "16px" }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setImageFiles(Array.from(e.target.files || []))
                    }
                    style={{
                      padding: "8px",
                      border: "1px solid #d9c3ad",
                      borderRadius: "8px",
                      fontSize: "13px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "-6px",
                      color: "#65574d",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {imageFiles.length > 0
                      ? `${imageFiles.length} image${imageFiles.length === 1 ? "" : "s"} selected`
                      : (Array.isArray(form.image_urls) &&
                            form.image_urls.length > 0) ||
                          form.image
                        ? "Existing images stay and new files are added when you save"
                        : "Choose one or more images"}
                  </div>
                </div>

                {imageFiles.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        color: "#1f1813",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.4px",
                        textTransform: "uppercase",
                      }}
                    >
                      New Images To Add
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(110px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {selectedImagePreviewUrls.map((previewUrl, index) => (
                        <div
                          key={`${previewUrl}-${index}`}
                          style={{
                            border: "1px solid #d9c3ad",
                            borderRadius: "10px",
                            overflow: "hidden",
                            background: "#fff",
                          }}
                        >
                          <img
                            src={previewUrl}
                            alt={`New upload ${index + 1}`}
                            style={{
                              width: "100%",
                              height: "80px",
                              objectFit: "cover",
                              display: "block",
                              background: "#f0e8e0",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedImage(index)}
                            style={{
                              width: "100%",
                              border: 0,
                              background: "#eef6ff",
                              color: "#23558a",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: "6px 8px",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editId && Array.isArray(form.image_urls) && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        color: "#1f1813",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.4px",
                        textTransform: "uppercase",
                      }}
                    >
                      Current Product Images
                    </p>

                    {form.image_urls.length === 0 ? (
                      <div
                        style={{
                          color: "#65574d",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        No current images. Upload new images and save.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(110px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {form.image_urls.map((imagePath, index) => (
                          <div
                            key={`${imagePath}-${index}`}
                            style={{
                              border: "1px solid #d9c3ad",
                              borderRadius: "10px",
                              overflow: "hidden",
                              background: "#fff",
                            }}
                          >
                            <img
                              src={resolveImageSrc(imagePath)}
                              alt={`Current product ${index + 1}`}
                              style={{
                                width: "100%",
                                height: "80px",
                                objectFit: "cover",
                                display: "block",
                                background: "#f0e8e0",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCurrentImage(index)}
                              style={{
                                width: "100%",
                                border: 0,
                                background: "#fff3ee",
                                color: "#9b2f1f",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: "6px 8px",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #245860, #2f747d)",
                    color: "#fff",
                    border: "0",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    transition: "transform 180ms ease, box-shadow 180ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow =
                      "0 12px 28px rgba(36, 88, 96, 0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  {editId ? "Update Product" : "Add Product"}
                </button>
              </form>
            </div>
          )}

          <h3
            style={{
              color: "#1f1813",
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: "28px",
              margin: "32px 0 20px 0",
              letterSpacing: "0.5px",
            }}
          >
            All Products ({visibleProducts.length})
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {visibleProducts.map((product) => {
              const productImages = getProductImages(product);
              const productId = product._id || product.id;
              const activeCardImageIndex = cardImageIndices[productId] || 0;

              return (
                <div
                  key={productId}
                  style={{
                    background: "#fff",
                    border: "1px solid #e0cec0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(31, 24, 19, 0.08)",
                    transition: "transform 200ms ease, box-shadow 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 20px rgba(31, 24, 19, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(31, 24, 19, 0.08)";
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      position: "relative",
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
                        src={productImages[activeCardImageIndex]}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "cover",
                          background: "#f0e8e0",
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

                        <span
                          style={{
                            position: "absolute",
                            right: "8px",
                            bottom: "8px",
                            background: "rgba(10, 16, 20, 0.78)",
                            color: "#fff",
                            padding: "4px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          {activeCardImageIndex + 1}/{productImages.length}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ padding: "12px" }}>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
                      {product.name}
                    </h4>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        color: "#245860",
                        fontWeight: "700",
                        fontSize: "14px",
                      }}
                    >
                      ${Number(product.price).toFixed(2)}
                    </p>
                    <p style={{ margin: "0 0 6px 0", color: "#5f5550" }}>
                      Gender: {normalizeGenderValue(product.gender)}
                    </p>
                    {isClothingCategory(product.category) ? (
                      <p style={{ margin: "0 0 12px 0", color: "#5f5550" }}>
                        Size stock:{" "}
                        {formatSizeStock(
                          product.sizeStock || product.size_stock || "-",
                        )}
                      </p>
                    ) : (
                      <p style={{ margin: "0 0 12px 0", color: "#5f5550" }}>
                        Stock: {product.stock ?? 0}
                      </p>
                    )}
                    {(product.category || "")
                      .toLowerCase()
                      .includes("surfboard") && (
                      <p style={{ margin: "0 0 12px 0", color: "#5f5550" }}>
                        Feet: {product.boardHeight ?? product.height ?? "-"} ft
                        • Volume: {product.boardVolume ?? product.volume ?? "-"}{" "}
                        L
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleEdit(product)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          background: "#245860",
                          color: "#fff",
                          border: "0",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "background 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#1a3f47";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#245860";
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="danger"
                        onClick={() => setProductToDelete(product)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          background: "#A0522D",
                          color: "#fff",
                          border: "0",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "background 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#8a5633";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#A0522D";
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleProducts.length === 0 && (
            <p style={{ marginTop: "18px", color: "#65574d" }}>
              No products match your search or category filter.
            </p>
          )}

          {productToDelete && (
            <div
              style={{
                position: "fixed",
                inset: "0",
                backgroundColor: "rgba(10, 16, 20, 0.72)",
                backdropFilter: "blur(8px)",
                display: "grid",
                placeItems: "center",
                zIndex: 2000,
              }}
              onClick={() => setProductToDelete(null)}
            >
              <div
                style={{
                  maxWidth: "480px",
                  width: "90%",
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "32px",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setProductToDelete(null)}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: "transparent",
                    border: "0",
                    fontSize: "20px",
                    cursor: "pointer",
                    color: "#65574d",
                  }}
                >
                  ×
                </button>

                <h3
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "20px",
                    color: "#1f1813",
                  }}
                >
                  Confirm Deletion
                </h3>

                <p style={{ margin: "0 0 24px 0", color: "#5f5550" }}>
                  You are about to delete the product{" "}
                  <strong>{productToDelete.name}</strong>. This action cannot be
                  undone.
                </p>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => setProductToDelete(null)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: "#e8e0d6",
                      color: "#1f1813",
                      border: "0",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#d9cec2";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#e8e0d6";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(productToDelete._id)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: "#A0522D",
                      color: "#fff",
                      border: "0",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#8a5633";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#A0522D";
                    }}
                  >
                    Delete product
                  </button>
                </div>
              </div>
            </div>
          )}

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
                          onClick={() =>
                            goToPreviewImage(previewImageIndex - 1)
                          }
                          aria-label="Previous product image"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="ps-previewArrow ps-previewArrowRight"
                          onClick={() =>
                            goToPreviewImage(previewImageIndex + 1)
                          }
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
                  <span className="ps-previewBadge">PRODUCT</span>
                  <h3 className="ps-previewName">
                    {previewProduct.name || "Product"}
                  </h3>
                  <p className="ps-previewCategory">
                    {previewProduct.category || "Catalog item"}
                  </p>
                  <p className="ps-previewDescription">
                    {previewProduct.description ||
                      "No description available yet."}
                  </p>

                  <div className="ps-previewPurchaseRow">
                    <div>
                      <p className="ps-previewPrice">
                        {Number.isFinite(Number(previewProduct.price))
                          ? `$${Number(previewProduct.price).toFixed(2)}`
                          : "View price"}
                      </p>
                      {isClothingCategory(previewProduct.category) ? (
                        <p className="ps-previewStock">
                          Size stock:{" "}
                          {formatSizeStock(
                            previewProduct.sizeStock ||
                              previewProduct.size_stock ||
                              "-",
                          )}
                        </p>
                      ) : (
                        <p className="ps-previewStock">
                          Stock: {previewProduct.stock ?? 0}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ManageProducts;
