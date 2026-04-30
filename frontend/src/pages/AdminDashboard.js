import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

function AdminDashboard({
  session,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
  onOpenOrders,
}) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeStatus = (value) => (value || "").toString().trim().toLowerCase();

  const getOrderBucket = (order) => {
    const status = normalizeStatus(order?.status);

    if (["paid", "success", "successful", "completed"].includes(status)) {
      return "successful";
    }

    if (["pending", "processing", "awaiting_payment", "open", "draft"].includes(status)) {
      return "pending";
    }

    return "failed";
  };

  const orderSummary = useMemo(() => {
    const summary = { successful: 0, failed: 0, pending: 0 };

    orders.forEach((order) => {
      summary[getOrderBucket(order)] += 1;
    });

    return summary;
  }, [orders]);

  const lowStockProducts = useMemo(
    () =>
      [...products]
        .filter((product) => {
          const stock = Number(product?.stock ?? 0);
          return stock >= 0 && stock <= 4;
        })
        .sort((left, right) => Number(left?.stock ?? 0) - Number(right?.stock ?? 0)),
    [products],
  );

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError("");

      try {
        const token = session?.token;
        const [productsRes, ordersRes] = await Promise.all([
          axios.get("/api/products"),
          axios.get("/api/cart/admin/orders", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      } catch (loadError) {
        setError(
          loadError.response?.data?.message ||
            loadError.message ||
            "Unable to load dashboard stats",
        );
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [session?.token]);

  const openOrders = (filter) => {
    if (typeof onOpenOrders === "function") {
      onOpenOrders(filter);
      return;
    }

    onNavigate("manage-orders", filter);
  };

  const cards = [
    { key: "successful", label: "Successful", value: orderSummary.successful, tone: "success", filter: "successful" },
    { key: "failed", label: "Failed", value: orderSummary.failed, tone: "danger", filter: "failed" },
    { key: "pending", label: "Pending", value: orderSummary.pending, tone: "muted", filter: "pending" },
  ];

  if (session?.user?.role !== "admin") {
    return (
      <div className="ps-page">
        <Header
          user={session?.user}
          preferredGender={preferredGender}
          onPreferredGenderChange={onPreferredGenderChange}
          currentPage={currentPage}
          onNavigate={onNavigate}
          onLogout={onLogout}
          cartCount={cartCount}
        />
        <main className="ps-main" style={{ padding: "70px 0" }}>
          <div className="ps-shell">
            <div className="ps-surface" style={{ padding: "30px" }}>
              <h1 className="ps-title" style={{ marginBottom: "10px" }}>Access restricted</h1>
              <p className="ps-lead">This section is available to admin accounts only.</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

      <main className="ps-main" style={{ padding: "70px 0" }}>
        <div className="ps-shell">
          <div style={{ marginBottom: "24px" }}>
            <p className="ps-pill" style={{ marginBottom: "12px" }}>Admin dashboard</p>
            <h1 className="ps-title" style={{ marginBottom: "10px" }}>Welcome, admin</h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              Track order health at a glance and watch products that are close to running out of stock.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {cards.map((item) => (
              <button
                key={item.key}
                type="button"
                className="ps-surface"
                onClick={() => openOrders(item.filter)}
                style={{
                  padding: "18px 20px",
                  border: "1px solid rgba(31, 24, 19, 0.08)",
                  textAlign: "left",
                  cursor: "pointer",
                  background:
                    item.tone === "success"
                      ? "rgba(36, 88, 96, 0.08)"
                      : item.tone === "danger"
                        ? "rgba(168, 63, 52, 0.08)"
                        : "rgba(31, 24, 19, 0.05)",
                }}
              >
                <div style={{ color: "#65574d", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "52px", lineHeight: 1, marginTop: "8px" }}>
                  {loading ? "..." : item.value}
                </div>
                <div style={{ color: "#5e5148", fontSize: "13px", marginTop: "6px" }}>
                  Tap to open the matching orders
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.9fr)", gap: "16px" }}>
            <div className="ps-surface" style={{ padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
                <div>
                  <h2 style={{ margin: "0 0 8px", fontSize: "24px" }}>Stock watchlist</h2>
                  <p style={{ margin: 0, color: "#5e5148" }}>Out of stock products first, then products with 1 to 4 units remaining.</p>
                </div>
                <button type="button" className="ps-btn ps-btn-primary" onClick={() => onNavigate("manage-products")}>Open products</button>
              </div>

              {loading ? (
                <p className="ps-lead">Loading inventory...</p>
              ) : lowStockProducts.length ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  {lowStockProducts.map((product) => {
                    const stock = Number(product.stock ?? 0);
                    const statusLabel = stock === 0 ? "Out of stock" : "Low stock";
                    const statusColor = stock === 0 ? "#a83f34" : "#245860";

                    return (
                      <div key={product.id || product._id} style={{ padding: "12px 14px", borderRadius: "14px", background: "rgba(36, 88, 96, 0.06)", border: "1px solid rgba(36, 88, 96, 0.12)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                          <strong>{product.name}</strong>
                          <span style={{ color: statusColor, fontWeight: 800 }}>{statusLabel}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "6px", alignItems: "center" }}>
                          <div style={{ color: "#5e5148", fontSize: "13px" }}>{product.category || "Uncategorized"}</div>
                          <span style={{ color: "#245860", fontWeight: 700 }}>Stock {stock}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="ps-lead">No products are currently out of stock or low on stock (1-4 units).</p>
              )}
            </div>

            <div className="ps-surface" style={{ padding: "22px" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>Order shortcuts</h2>
              <p style={{ margin: "0 0 18px", color: "#5e5148" }}>Jump straight into the matching order list.</p>

              <div style={{ display: "grid", gap: "10px" }}>
                {cards.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="ps-btn"
                    onClick={() => openOrders(item.filter)}
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      display: "flex",
                      background:
                        item.tone === "success"
                          ? "rgba(36, 88, 96, 0.08)"
                          : item.tone === "danger"
                            ? "rgba(168, 63, 52, 0.08)"
                            : "rgba(31, 24, 19, 0.06)",
                      color: "#1f1813",
                      border: "1px solid rgba(31, 24, 19, 0.08)",
                    }}
                  >
                    <span>{item.label} orders</span>
                    <span aria-hidden="true">›</span>
                  </button>
                ))}
              </div>

              {error ? (
                <div className="ps-surface" style={{ marginTop: "18px", padding: "16px 18px" }}>
                  <p style={{ margin: 0, color: "#991b1b" }}>{error}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AdminDashboard;
