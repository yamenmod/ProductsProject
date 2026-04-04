import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Products({
  session,
  currentPage,
  selectedCategory,
  cartItems,
  onAddToCart,
  onNavigate,
  onLogout,
  cartCount = 0,
}) {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(
    selectedCategory || "All",
  );
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    stock: "",
  });
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [cart, setCart] = useState(cartItems || []);
  const fileInputRef = React.useRef(null);

  const isAdmin = session.user.role === "admin";

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

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      category: "",
      image: "",
      stock: "",
    });
    setImageFile(null);
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

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("description", form.description.trim());
    payload.append("price", Number(form.price));
    payload.append("category", form.category.trim());
    payload.append("stock", form.stock === "" ? 0 : Number(form.stock));

    if (imageFile) {
      payload.append("image", imageFile);
    } else if (form.image) {
      payload.append("image", form.image.trim());
    }

    try {
      if (editId) {
        await axios.put(`/api/products/${editId}`, payload, {
          headers: {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        setSuccess("Product updated");
      } else {
        await axios.post("/api/products", payload, {
          headers: {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        setSuccess("Product added");
      }

      resetForm();
      loadProducts();
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Request failed");
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      category: product.category || "",
      image: product.image || "",
      stock: product.stock ?? 0,
    });
    setImageFile(null);
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
    }
  };

  const handleAddToCart = async (productId) => {
    setError("");
    setSuccess("");

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
      setSuccess("Added to cart");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Add to cart failed");
    }
  };

  const categories = [
    "All",
    ...new Set(
      products
        .map((product) => product.category?.trim())
        .filter((category) => Boolean(category)),
    ),
  ];

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((product) => product.category === activeCategory);

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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
      }}
    >
      <Header
        user={session.user}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartItems?.length || 0}
      />

      <div style={{ flex: 1, padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "40px",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderRadius: "16px",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          <div
            style={{
              marginBottom: "32px",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "20px",
            }}
          >
            <h2
              style={{
                color: "#0f172a",
                fontSize: "32px",
                margin: "0 0 8px 0",
                fontWeight: "800",
                letterSpacing: "-0.5px",
              }}
            >
              Product Shop
            </h2>
            <p
              style={{
                margin: "0",
                color: "#64748b",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              Browse our collection of premium products
            </p>
          </div>

          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                color: "#991b1b",
                background: "#fef2f2",
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
                border: "1px solid #86efac",
                color: "#15803d",
                background: "#f0fdf4",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              ✓ {success}
            </div>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  resetForm();
                }
              }}
              style={{
                marginBottom: "24px",
                padding: "12px 20px",
                background: "linear-gradient(135deg, #0084b4 0%, #0066a1 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(0, 132, 180, 0.15)",
              }}
              onMouseOver={(e) => {
                e.target.style.boxShadow = "0 8px 20px rgba(0, 132, 180, 0.25)";
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.target.style.boxShadow = "0 4px 12px rgba(0, 132, 180, 0.15)";
                e.target.style.transform = "translateY(0)";
              }}
            >
              {showForm ? "✕ Cancel" : "+ Add New Product"}
            </button>
          )}

          {isAdmin && showForm && (
            <div
              style={{
                marginBottom: "30px",
                padding: "24px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <form
                onSubmit={handleSubmit}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                }}
              >
                <input
                  placeholder="Product name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0084b4";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 132, 180, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0084b4";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 132, 180, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Price (number) *"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0084b4";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 132, 180, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
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
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0084b4";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 132, 180, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">Select a category</option>
                  <option value="Surfboards">Surfboards</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Wetsuits">Wetsuits</option>
                </select>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    background: "white",
                    cursor: "pointer",
                  }}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Stock"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0084b4";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(0, 132, 180, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  className="primary"
                  type="submit"
                  style={{
                    padding: "11px 16px",
                    background:
                      "linear-gradient(135deg, #0084b4 0%, #0066a1 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(0, 132, 180, 0.15)",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.boxShadow =
                      "0 8px 20px rgba(0, 132, 180, 0.25)";
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(0, 132, 180, 0.15)";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  {editId ? "Update Product" : "Add Product"}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      padding: "11px 16px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "#e2e8f0";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "#f1f5f9";
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </div>
          )}

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
                      ? "linear-gradient(135deg, #0084b4 0%, #0066a1 100%)"
                      : "#f1f5f9",
                  color: activeCategory === category ? "white" : "#475569",
                  border:
                    activeCategory === category ? "none" : "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow:
                    activeCategory === category
                      ? "0 4px 12px rgba(0, 132, 180, 0.15)"
                      : "none",
                }}
                onMouseOver={(e) => {
                  if (activeCategory !== category) {
                    e.target.style.background = "#e2e8f0";
                    e.target.style.borderColor = "#94a3b8";
                  }
                }}
                onMouseOut={(e) => {
                  if (activeCategory !== category) {
                    e.target.style.background = "#f1f5f9";
                    e.target.style.borderColor = "#cbd5e1";
                  }
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredProducts.length === 0 ? (
              <p>No products found. Add your first product.</p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product._id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <img
                    src={resolveImageSrc(product.image)}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ padding: "12px" }}>
                    <h3 style={{ marginBottom: "8px" }}>{product.name}</h3>
                    <p style={{ margin: "0 0 6px 0" }}>{product.description}</p>
                    <p style={{ margin: "0 0 6px 0", fontWeight: "700" }}>
                      ${Number(product.price).toFixed(2)}
                    </p>
                    <p style={{ margin: "0 0 6px 0" }}>
                      Category: {product.category || "-"}
                    </p>
                    <p style={{ margin: "0 0 12px 0" }}>
                      Stock: {product.stock ?? 0}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {isAdmin ? (
                        <>
                          <button onClick={() => handleEdit(product)}>
                            Edit
                          </button>
                          <button
                            className="danger"
                            onClick={() => handleDelete(product._id)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        (() => {
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
                        })()
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Products;
