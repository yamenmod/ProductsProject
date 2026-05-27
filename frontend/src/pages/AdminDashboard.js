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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  const filteredOrders = useMemo(() => {
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return orders.filter((order) => {
      const createdAt = new Date(order?.createdAt || order?.created_at || 0).getTime();

      if (Number.isNaN(createdAt)) {
        return false;
      }

      if (fromTime !== null && createdAt < fromTime) {
        return false;
      }

      if (toTime !== null && createdAt > toTime) {
        return false;
      }

      return true;
    });
  }, [orders, dateFrom, dateTo]);

  const filteredSummary = useMemo(() => {
    const summary = { successful: 0, failed: 0, pending: 0 };

    filteredOrders.forEach((order) => {
      summary[getOrderBucket(order)] += 1;
    });

    return summary;
  }, [filteredOrders]);

  const orderTrend = useMemo(() => {
    const grouped = new Map();

    filteredOrders.forEach((order) => {
      const date = new Date(order?.createdAt || order?.created_at || 0);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const label = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      grouped.set(label, (grouped.get(label) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .slice(-7);
  }, [filteredOrders]);

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

  const openProductEdit = (product) => {
    onNavigate("manage-products", product);
  };

  const cards = [
    { key: "successful", label: "Successful", value: filteredSummary.successful, tone: "success", filter: "successful" },
    { key: "failed", label: "Failed", value: filteredSummary.failed, tone: "danger", filter: "failed" },
    { key: "pending", label: "Pending", value: filteredSummary.pending, tone: "muted", filter: "pending" },
    { key: "range", label: "In range", value: filteredOrders.length, tone: "muted", filter: "all" },
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
            <h1 className="ps-title" style={{ marginBottom: "8px", fontSize: "clamp(30px, 4vw, 46px)" }}>Welcome, admin</h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              Track order health at a glance and watch products that are close to running out of stock.
            </p>
          </div>

          <div
            className="ps-surface"
            style={{
              padding: "18px 20px",
              marginBottom: "22px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "end",
            }}
          >
            <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
              <div style={{ color: "#65574d", fontSize: "12px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
                From
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                style={{ width: "100%", padding: "11px 12px", borderRadius: "12px", border: "1px solid rgba(31, 24, 19, 0.14)", background: "rgba(255, 250, 242, 0.95)", fontSize: "14px" }}
              />
            </div>
            <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
              <div style={{ color: "#65574d", fontSize: "12px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
                To
              </div>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                style={{ width: "100%", padding: "11px 12px", borderRadius: "12px", border: "1px solid rgba(31, 24, 19, 0.14)", background: "rgba(255, 250, 242, 0.95)", fontSize: "14px" }}
              />
            </div>
            <button
              type="button"
              className="ps-btn ps-btn-secondary"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              style={{ height: "44px" }}
            >
              Clear range
            </button>
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
                  {item.key === "range"
                    ? "Orders between the selected dates"
                    : "Tap to open the matching orders"}
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
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="ps-btn ps-btn-secondary"
                              onClick={() => openProductEdit(product)}
                              style={{ padding: "8px 12px", fontSize: "12px" }}
                            >
                              Edit
                            </button>
                            <span style={{ color: "#245860", fontWeight: 700 }}>Stock {stock}</span>
                          </div>
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
              <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>Orders graph</h2>
              <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
                Orders shown by day for the selected date range.
              </p>

              {orderTrend.length ? (
                <div style={{ display: "flex", alignItems: "end", gap: "12px", minHeight: "240px", paddingTop: "10px" }}>
                  {orderTrend.map((point) => {
                    const maxValue = Math.max(...orderTrend.map((entry) => entry.value), 1);
                    const barHeight = Math.max(24, (point.value / maxValue) * 180);

                    return (
                      <div key={point.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "end", minHeight: "180px" }}>
                          <div
                            style={{
                              width: "100%",
                              maxWidth: "56px",
                              height: `${barHeight}px`,
                              borderRadius: "16px 16px 10px 10px",
                              background: "linear-gradient(180deg, #245860 0%, #2f747d 100%)",
                              boxShadow: "0 14px 28px rgba(36, 88, 96, 0.24)",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 800, color: "#65574d", textAlign: "center" }}>{point.label}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1f1813" }}>{point.value}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="ps-lead">No orders found for the selected dates.</p>
              )}

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
