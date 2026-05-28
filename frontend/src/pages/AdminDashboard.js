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
  const getTodayInputValue = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getLastMonthInputValue = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const year = lastMonth.getFullYear();
    const month = String(lastMonth.getMonth() + 1).padStart(2, "0");
    const day = String(lastMonth.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const [dateFrom, setDateFrom] = useState(getLastMonthInputValue);
  const [dateTo, setDateTo] = useState(getTodayInputValue);
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

    return "unsuccessful";
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
    const summary = { successful: 0, unsuccessful: 0, pending: 0 };

    filteredOrders.forEach((order) => {
      summary[getOrderBucket(order)] += 1;
    });

    return { successful: summary.successful, unsuccessful: summary.unsuccessful, pending: summary.pending };
  }, [filteredOrders]);

  const statusChartData = useMemo(
    () => [
      {
        key: "successful",
        label: "Successful",
        value: filteredSummary.successful,
        color: "#79b64a",
      },
      {
        key: "unsuccessful",
        label: "Unsuccessful",
        value: filteredSummary.unsuccessful,
        color: "#f07c2e",
      },
      {
        key: "pending",
        label: "Pending",
        value: filteredSummary.pending,
        color: "#ffbf24",
      },
    ],
    [filteredSummary],
  );

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
    { key: "unsuccessful", label: "Unsuccessful", value: filteredSummary.unsuccessful, tone: "danger", filter: "unsuccessful" },
    { key: "pending", label: "Pending", value: filteredSummary.pending, tone: "muted", filter: "pending" },
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
            <h1 className="ps-title" style={{ marginBottom: "8px", fontSize: "clamp(24px, 3vw, 34px)" }}>Welcome, admin</h1>
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
                style={{ width: "100%", padding: "11px 12px", borderRadius: "12px", border: "1px solid rgba(31, 24, 19, 0.14)", background: "rgba(255, 250, 242, 0.95)", fontSize: "13px" }}
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
                style={{ width: "100%", padding: "11px 12px", borderRadius: "12px", border: "1px solid rgba(31, 24, 19, 0.14)", background: "rgba(255, 250, 242, 0.95)", fontSize: "13px" }}
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
                Orders shown by status for the selected date range.
              </p>

              {statusChartData.some((item) => item.value > 0) ? (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: "18px", alignItems: "center", paddingTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        width: "220px",
                        height: "220px",
                        borderRadius: "50%",
                        background: `conic-gradient(${statusChartData
                          .map((item, index) => {
                            const total = statusChartData.reduce((sum, entry) => sum + entry.value, 0) || 1;
                            const start = statusChartData
                              .slice(0, index)
                              .reduce((sum, entry) => sum + entry.value, 0);
                            const end = start + item.value;
                            return `${item.color} ${(start / total) * 100}% ${(end / total) * 100}%`;
                          })
                          .join(", ")})`,
                        boxShadow: "0 18px 36px rgba(31, 24, 19, 0.14)",
                        border: "10px solid rgba(255, 250, 242, 0.95)",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: "12px" }}>
                    {statusChartData.map((item) => (
                      <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 14px", borderRadius: "14px", background: "rgba(255, 250, 242, 0.9)", border: "1px solid rgba(31, 24, 19, 0.08)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ width: "12px", height: "12px", borderRadius: "999px", background: item.color, display: "inline-block" }} />
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f1813" }}>{item.label}</span>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: item.color, lineHeight: 1 }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
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
