import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

const normalizeStatus = (value) => {
  // Convert raw database status text into a cleaner label for the UI.
  // This keeps paid orders and cancelled orders easy to scan.
  const normalized = (value || "").toString().trim().toLowerCase();

  if (["paid", "success", "successful", "completed"].includes(normalized)) {
    return { label: "Successful", tone: "success" };
  }

  if (
    ["cancelled", "canceled", "failed", "rejected", "declined"].includes(
      normalized,
    )
  ) {
    return { label: "Cancelled", tone: "danger" };
  }

  return {
    label: normalized
      ? normalized[0].toUpperCase() + normalized.slice(1)
      : "Unknown",
    tone: "neutral",
  };
};

function ManageOrders({
  session,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // Load the admin order list from the backend when the page opens.
  // The request includes the session token so the server can enforce access.
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get("/api/cart/admin/orders", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        setOrders(response.data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Failed to load orders",
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [session.token]);

  // Filter the already-loaded orders without making another server request.
  // This keeps the admin dashboard responsive when switching views.
  const filteredOrders = useMemo(() => {
    if (filter === "all") {
      return orders;
    }

    return orders.filter((order) => {
      const normalized = (order.status || "").toString().toLowerCase();
      if (filter === "successful") {
        return ["paid", "success", "successful", "completed"].includes(
          normalized,
        );
      }

      if (filter === "cancelled") {
        return [
          "cancelled",
          "canceled",
          "failed",
          "rejected",
          "declined",
        ].includes(normalized);
      }

      return true;
    });
  }, [filter, orders]);

  // Precompute the counts shown in the small dashboard summary cards.
  // These numbers help the admin spot successful and cancelled payments fast.
  const summary = useMemo(() => {
    const successful = orders.filter((order) =>
      ["paid", "success", "successful", "completed"].includes(
        (order.status || "").toString().toLowerCase(),
      ),
    ).length;
    const cancelled = orders.filter((order) =>
      ["cancelled", "canceled", "failed", "rejected", "declined"].includes(
        (order.status || "").toString().toLowerCase(),
      ),
    ).length;

    return { total: orders.length, successful, cancelled };
  }, [orders]);

  // Only admin accounts should ever see this page content.
  // Non-admin sessions get a clear access-restricted message instead.
  const canAccess = session.user.role === "admin";

  if (!canAccess) {
    return (
      <div className="ps-page">
        <Header
          user={session.user}
          currentPage={currentPage}
          onNavigate={onNavigate}
          onLogout={onLogout}
          cartCount={cartCount}
        />

        <main className="ps-main" style={{ padding: "70px 0" }}>
          <div className="ps-shell">
            <div className="ps-surface" style={{ padding: "30px" }}>
              <h1 className="ps-title" style={{ marginBottom: "10px" }}>
                Access restricted
              </h1>
              <p className="ps-lead">
                This section is available to admin accounts only.
              </p>
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
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartCount}
      />

      <main className="ps-main" style={{ padding: "70px 0" }}>
        <div className="ps-shell">
          <div style={{ marginBottom: "24px" }}>
            <p className="ps-pill" style={{ marginBottom: "12px" }}>
              Admin dashboard
            </p>
            <h1 className="ps-title" style={{ marginBottom: "10px" }}>
              Manage orders
            </h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              Review every checkout and quickly spot whether the payment ended
              in a successful charge or a cancelled attempt.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {[
              { label: "Total orders", value: summary.total },
              { label: "Successful", value: summary.successful },
              { label: "Cancelled", value: summary.cancelled },
            ].map((item) => (
              <div
                key={item.label}
                className="ps-surface"
                style={{ padding: "18px 20px" }}
              >
                <div
                  style={{
                    color: "#65574d",
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: "44px",
                    lineHeight: 1,
                    marginTop: "8px",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            {[
              { key: "all", label: "All" },
              { key: "successful", label: "Successful" },
              { key: "cancelled", label: "Cancelled" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className="ps-btn"
                onClick={() => setFilter(item.key)}
                style={{
                  background:
                    filter === item.key
                      ? "linear-gradient(135deg, #245860, #2f747d)"
                      : "rgba(255, 250, 242, 0.88)",
                  color: filter === item.key ? "#fff" : "#1f1813",
                  border: "1px solid rgba(31, 24, 19, 0.08)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            className="ps-surface"
            style={{ padding: "22px", overflowX: "auto" }}
          >
            {loading ? (
              <p className="ps-lead">Loading orders...</p>
            ) : error ? (
              <p className="ps-lead" style={{ color: "#a83f34" }}>
                {error}
              </p>
            ) : filteredOrders.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      color: "#65574d",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "1.2px",
                    }}
                  >
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
                    const status = normalizeStatus(order.status);

                    return (
                      <tr
                        key={order.id}
                        style={{
                          borderTop: "1px solid rgba(31, 24, 19, 0.08)",
                        }}
                      >
                        <td style={{ padding: "14px 10px", fontWeight: 700 }}>
                          #{order.id}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {order.username}
                        </td>
                        <td style={{ padding: "14px 10px", color: "#65574d" }}>
                          {order.email}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {order.itemCount}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          ${Number(order.total).toFixed(2)}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 800,
                              background:
                                status.tone === "success"
                                  ? "rgba(36, 88, 96, 0.12)"
                                  : status.tone === "danger"
                                    ? "rgba(168, 63, 52, 0.12)"
                                    : "rgba(31, 24, 19, 0.08)",
                              color:
                                status.tone === "success"
                                  ? "#245860"
                                  : status.tone === "danger"
                                    ? "#a83f34"
                                    : "#65574d",
                            }}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px", color: "#65574d" }}>
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="ps-lead">No orders match this filter yet.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ManageOrders;
