import React, { useEffect, useState } from "react";
import axios from "axios";

function MyOrders({ session, user, onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await axios.get("/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setOrders(resp.data || []);
    } catch (err) {
      console.error("Failed to load orders", err?.response || err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      await axios.post(`/api/orders/${orderId}/cancel`, null, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel order");
    }
  };

  const canCancel = (order) => {
    if (!order.paid_at) return false;
    if (order.order_status !== "successful") return false;
    const paidAt = new Date(order.paid_at);
    const now = new Date();
    const ms48 = 48 * 60 * 60 * 1000;
    return now - paidAt <= ms48;
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "pending":
        return "#ff9800";
      case "successful":
        return "#4caf50";
      case "cancelled":
        return "#f44336";
      case "expired":
        return "#9c27b0";
      default:
        return "#757575";
    }
  };

  const getStatusLabel = (status) => {
    return (status || "unknown").charAt(0).toUpperCase() + (status || "unknown").slice(1);
  };

  return (
    <div style={{ padding: "40px 20px", minHeight: "100vh" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "30px", color: "#1f1813", fontSize: "32px" }}>My Orders</h2>
        {loading ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#f5f5f5", borderRadius: "8px" }}>
            <p>No orders found.</p>
            <button
              className="ps-btn ps-btn-primary"
              onClick={() => onNavigate("home")}
              style={{ marginTop: "16px" }}
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {orders.map((o) => (
              <div
                key={o.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "20px",
                  borderRadius: "12px",
                  background: "#fffdf8",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 8px 0", color: "#1f1813" }}>Order #{o.id}</h3>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {new Date(o.created_at).toLocaleDateString()} at {new Date(o.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ marginBottom: "8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          background: getStatusBadgeColor(o.order_status),
                          color: "white",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {getStatusLabel(o.order_status)}
                      </span>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#245860" }}>
                      Total: ${Number(o.total).toFixed(2)}
                    </div>
                    {o.payment_status && (
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                        Payment: {o.payment_status}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: "16px", borderTop: "1px solid #eee", paddingTop: "12px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#1f1813" }}>Items:</h4>
                  {o.items && o.items.length > 0 ? (
                    <ul style={{ margin: "0", paddingLeft: "20px", color: "#555", fontSize: "13px" }}>
                      {o.items.map((it, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>
                          {it.name} — Qty: {it.quantity} — ${Number(it.price).toFixed(2)} each
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {canCancel(o) && (
                    <button
                      className="ps-btn ps-btn-secondary"
                      onClick={() => handleCancel(o.id)}
                      style={{ padding: "10px 16px" }}
                    >
                      Cancel Order
                    </button>
                  )}
                  {o.order_status === "successful" && !canCancel(o) && (
                    <div style={{ fontSize: "12px", color: "#999", alignSelf: "center" }}>
                      Cancellation window expired
                    </div>
                  )}
                  <button
                    className="ps-btn ps-btn-primary"
                    onClick={() => onNavigate("home")}
                    style={{ padding: "10px 16px" }}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyOrders;
