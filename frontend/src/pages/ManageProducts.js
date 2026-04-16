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
}) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    gender: "unisex",
    image: "",
    stock: "",
  });
  const [editId, setEditId] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const fileInputRef = React.useRef(null);

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

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      category: "",
      gender: "unisex",
      image: "",
      stock: "",
    });
    setImageFiles([]);
    setEditId(null);
    setShowForm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Unable to read image file"));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || form.price === "") {
      setError("Name and price are required.");
      return;
    }

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("description", form.description.trim());
    payload.append("price", Number(form.price));
    payload.append("category", form.category.trim());
    payload.append("gender", normalizeGenderValue(form.gender));
    payload.append("stock", form.stock === "" ? 0 : Number(form.stock));

    if (imageFiles.length > 0) {
      const imageDataUrls = await Promise.all(
        imageFiles.map((file) => readFileAsDataUrl(file)),
      );

      payload.append("image", JSON.stringify(imageDataUrls));
    } else if (form.image) {
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
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      category: product.category || "",
      gender: normalizeGenderValue(product.gender),
      image: product.image || "",
      stock: product.stock ?? 0,
    });
    setImageFiles([]);
    setEditId(product._id);
    setShowForm(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

  const categories = [
    "All",
    "Surfboards",
    "Wetsuits",
    "Clothing",
    "Surfboard Accessories",
  ];

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
                      fontSize: "14px",
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
                      fontSize: "14px",
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
                      fontSize: "14px",
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
                      fontSize: "14px",
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
                      fontSize: "14px",
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
                      : form.image
                        ? "Existing images stay and new files are added when you save"
                        : "Choose one or more images"}
                  </div>
                </div>

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
            All Products ({products.length})
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "20px",
            }}
          >
            {products.map((product) => (
              <div
                key={product._id}
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
                <img
                  src={resolveImageSrc(product.image)}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    background: "#f0e8e0",
                  }}
                />
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
                    Category: {product.category || "-"}
                  </p>
                  <p style={{ margin: "0 0 6px 0", color: "#5f5550" }}>
                    Gender: {normalizeGenderValue(product.gender)}
                  </p>
                  <p style={{ margin: "0 0 12px 0", color: "#5f5550" }}>
                    Stock: {product.stock ?? 0}
                  </p>
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
                        background: "#c1290f",
                        color: "#fff",
                        border: "0",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        transition: "background 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "#8b1d0a";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "#c1290f";
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
                      background: "#c1290f",
                      color: "#fff",
                      border: "0",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#8b1d0a";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#c1290f";
                    }}
                  >
                    Delete product
                  </button>
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
