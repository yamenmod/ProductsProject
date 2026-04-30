import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

function ManageOrders({
  session,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
  initialFilter = "all",
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(initialFilter || "all");

  useEffect(() => {
    setSelectedFilter(initialFilter || "all");
  }, [initialFilter]);

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

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get("/api/cart/admin/orders", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        setOrders(Array.isArray(response.data) ? response.data : []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [session?.token]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = !normalizedSearch
        ? true
        : [order.id, order.username, order.email]
            .filter(Boolean)
            .some((value) => value.toString().toLowerCase().includes(normalizedSearch));

      const matchesFilter = selectedFilter === "all" ? true : getOrderBucket(order) === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [orders, searchTerm, selectedFilter]);

  const summary = useMemo(() => {
    const counts = { successful: 0, failed: 0, pending: 0 };

    orders.forEach((order) => {
      counts[getOrderBucket(order)] += 1;
    });

    return counts;
  }, [orders]);

  const statusTone = (bucket) => {
    if (bucket === "successful") {
      return { background: "rgba(36, 88, 96, 0.12)", color: "#245860" };
    }

    if (bucket === "failed") {
      return { background: "rgba(168, 63, 52, 0.12)", color: "#a83f34" };
    }

    return { background: "rgba(100, 116, 139, 0.12)", color: "#475569" };
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
  };

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
            <h1 className="ps-title" style={{ marginBottom: "10px" }}>Manage orders</h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              Review every checkout and quickly spot whether the payment ended up successful, failed, or still pending.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Successful", value: summary.successful, bucket: "successful" },
              { label: "Failed", value: summary.failed, bucket: "failed" },
              { label: "Pending", value: summary.pending, bucket: "pending" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="ps-surface"
                onClick={() => setSelectedFilter(item.bucket)}
                style={{
                  padding: "18px 20px",
                  border: "1px solid rgba(31, 24, 19, 0.08)",
                  textAlign: "left",
                  cursor: "pointer",
                  background: statusTone(item.bucket).background,
                }}
              >
                <div style={{ color: "#65574d", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "44px", lineHeight: 1, marginTop: "8px", color: statusTone(item.bucket).color }}>
                  {loading ? "..." : item.value}
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by order number or customer name"
              style={{
                minWidth: "280px",
                flex: "1 1 280px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(31, 24, 19, 0.14)",
                background: "rgba(255, 250, 242, 0.95)",
                fontSize: "14px",
              }}
            />

            {[
              { key: "all", label: "All" },
              { key: "successful", label: "Successful" },
              { key: "failed", label: "Failed" },
              { key: "pending", label: "Pending" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className="ps-btn"
                onClick={() => setSelectedFilter(item.key)}
                style={{
                  background: selectedFilter === item.key ? "linear-gradient(135deg, #245860, #2f747d)" : "rgba(255, 250, 242, 0.88)",
                  color: selectedFilter === item.key ? "#fff" : "#1f1813",
                  border: "1px solid rgba(31, 24, 19, 0.08)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="ps-surface" style={{ padding: "22px", overflowX: "auto" }}>
            {loading ? (
              <p className="ps-lead">Loading orders...</p>
            ) : error ? (
              <p className="ps-lead" style={{ color: "#a83f34" }}>{error}</p>
            ) : filteredOrders.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#65574d", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.2px" }}>
                    <th style={{ padding: "12px 10px" }}>Order</th>
                    <th style={{ padding: "12px 10px" }}>Customer</th>
                    <th style={{ padding: "12px 10px" }}>Email</th>
                    <th style={{ padding: "12px 10px" }}>Items</th>
                    <th style={{ padding: "12px 10px" }}>Total</th>
                    <th style={{ padding: "12px 10px" }}>Payment</th>
                    <th style={{ padding: "12px 10px" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const bucket = getOrderBucket(order);
                    const tone = statusTone(bucket);

                    return (
                      <tr key={order.id} style={{ borderTop: "1px solid rgba(31, 24, 19, 0.08)" }}>
                        <td style={{ padding: "14px 10px", fontWeight: 700 }}>#{order.id}</td>
                        <td style={{ padding: "14px 10px" }}>{order.username || "-"}</td>
                        <td style={{ padding: "14px 10px", color: "#65574d" }}>{order.email || "-"}</td>
                        <td style={{ padding: "14px 10px" }}>{order.itemCount ?? 0}</td>
                        <td style={{ padding: "14px 10px" }}>${Number(order.total ?? 0).toFixed(2)}</td>
                        <td style={{ padding: "14px 10px" }}>
                          <span style={{ display: "inline-flex", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800, textTransform: "capitalize", background: tone.background, color: tone.color }}>
                            {bucket}
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px", color: "#65574d" }}>{formatDate(order.createdAt || order.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="ps-lead">No orders match the current filter.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ManageOrders;
