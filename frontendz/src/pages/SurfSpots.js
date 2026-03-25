import React, { useEffect, useState } from "react";
import axios from "axios";
import Footer from "../components/Footer";

function Products({ session, onLogout, onBack }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
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

  const handleRemoveFromCart = async (productId) => {
    setError("");
    setSuccess("");

    try {
      const res = await axios.delete(`/api/cart/${productId}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      setCart(res.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Remove failed");
    }
  };

  const handleCheckout = async () => {
    setError("");
    setSuccess("");

    try {
      const res = await axios.post(
        "/api/cart/checkout",
        {},
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );
      setSuccess(`${res.data.message}. Total: $${res.data.order.total}`);
      setCart([]);
      loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Checkout failed");
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

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0,
  );

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
        background: "linear-gradient(135deg, #e3f2fd 0%, #b3e5fc 100%)",
      }}
    >
      <div style={{ flex: 1, padding: "20px" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "30px auto",
            padding: "35px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 12px 40px rgba(10, 61, 98, 0.15)",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}
        >
          <h2 style={{ color: "#0a3d62", fontSize: "28px", marginTop: 0 }}>
            🛍️ Product Shop
          </h2>
          <p style={{ marginTop: "0", color: "#1e3a5a", marginBottom: "18px" }}>
            Logged in as <strong>{session.user.username}</strong> (
            {session.user.role})
          </p>

          <div style={{ marginBottom: "12px", display: "flex", gap: "10px" }}>
            <button onClick={onBack}>Back</button>
            <button onClick={onLogout}>Logout</button>
          </div>

          {error && (
            <div
              style={{
                marginBottom: "18px",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #d32f2f",
                color: "#d32f2f",
                background: "#ffebee",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginBottom: "18px",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #2e7d32",
                color: "#2e7d32",
                background: "#e8f5e9",
              }}
            >
              {success}
            </div>
          )}

          {isAdmin && (
            <form
              onSubmit={handleSubmit}
              style={{
                marginBottom: "30px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <input
                placeholder="Product name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
              <input
                type="number"
                min="0"
                placeholder="Price (number) *"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <input
                type="number"
                min="0"
                placeholder="Stock"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
              <button className="primary" type="submit">
                {editId ? "Update Product" : "Add Product"}
              </button>
              {editId && (
                <button type="button" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </form>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                style={{
                  background:
                    activeCategory === category ? "#0084b4" : "#f0f0f0",
                  color: activeCategory === category ? "#fff" : "#1e3a5a",
                }}
              >
                {category}
              </button>
            ))}
          </div>

          {!isAdmin && (
            <div
              style={{
                marginBottom: "22px",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
                background: "#fafafa",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Cart</h3>
              {cart.length === 0 ? (
                <p style={{ marginBottom: "10px" }}>Your cart is empty.</p>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <div
                      key={item.product?._id || index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span>
                        {item.product?.name} x {item.quantity}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          $
                          {((item.product?.price || 0) * item.quantity).toFixed(
                            2,
                          )}
                        </span>
                        <button
                          onClick={() =>
                            handleRemoveFromCart(item.product?._id)
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <p style={{ fontWeight: "700", marginBottom: "10px" }}>
                    Total: ${cartTotal.toFixed(2)}
                  </p>
                  <button className="primary" onClick={handleCheckout}>
                    Buy Now
                  </button>
                </>
              )}
            </div>
          )}

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
                        <button
                          className="primary"
                          onClick={() => handleAddToCart(product._id)}
                          disabled={(product.stock ?? 0) < 1}
                        >
                          {(product.stock ?? 0) < 1
                            ? "Out of Stock"
                            : "Add to Cart"}
                        </button>
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
