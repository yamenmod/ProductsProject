/**
 * My Orders Page
 * Customer page for viewing their own order history
 * Features order status display, cancellation functionality, and countdown timer
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { getStatusColor, getStatusTone } from "../utils/statusColors";
import {
  getOrderBucket,
  getOrderStatusLabel,
  getUserFacingOrderBucket,
} from "../utils/orderStatus";

function MyOrders({ session, user, onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [timeLeft, setTimeLeft] = useState({});

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

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newTimeLeft = {};
      orders.forEach((order) => {
        if (order.paid_at && isSuccessfulOrder(order)) {
          const paidAt = new Date(order.paid_at);
          const elapsed = now - paidAt;
          const ms2Minutes = 2 * 60 * 1000;
          const remaining = ms2Minutes - elapsed;
          if (remaining > 0) {
            newTimeLeft[order.id] = Math.floor(remaining / 1000);
          } else {
            newTimeLeft[order.id] = 0;
          }
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  const isSuccessfulOrder = (order) => getOrderBucket(order) === "success";

  const canCancel = (order) => {
    if (!order.paid_at) return false;
    if (!isSuccessfulOrder(order)) return false;
    const paidAt = new Date(order.paid_at);
    const now = new Date();
    const ms2Minutes = 2 * 60 * 1000;
    return now - paidAt <= ms2Minutes;
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;

    setCancelling(true);
    try {
      await axios.post(`/api/orders/${cancelTargetId}/cancel`, null, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      setCancelTargetId(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const renderStatusBadge = (order) => {
    const bucket = getUserFacingOrderBucket(order);
    if (!bucket) {
      return null;
    }

    const tone = getStatusTone(bucket, true);

    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 12px",
          background: getStatusColor(bucket),
          color: "#fff",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "600",
          border: tone.border,
        }}
      >
        {getOrderStatusLabel(order)}
      </span>
    );
  };

  return (
    <div style={{ padding: "40px 20px", minHeight: "100vh" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "30px", color: "#1f1813", fontSize: "32px" }}>
          My Orders
        </h2>
        {loading ? (
          <p>Loading...</p>
        ) : orders.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "#f5f5f5",
              borderRadius: "8px",
            }}
          >
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 8px 0", color: "#1f1813" }}>
                      Order #{o.id}
                    </h3>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {new Date(o.created_at).toLocaleDateString()} at{" "}
                      {new Date(o.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ marginBottom: "8px" }}>{renderStatusBadge(o)}</div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#245860",
                      }}
                    >
                      Total: ${Number(o.total).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginBottom: "16px",
                    borderTop: "1px solid #eee",
                    paddingTop: "12px",
                  }}
                >
                  <h4
                    style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#1f1813" }}
                  >
                    Items:
                  </h4>
                  {canCancel(o) && (
                    <div
                      style={{
                        marginBottom: "12px",
                        fontSize: "12px",
                        color: "#d9534f",
                        fontStyle: "italic",
                        padding: "8px",
                        background: "#fff5f5",
                        borderLeft: "3px solid #d9534f",
                        borderRadius: "4px",
                      }}
                    >
                      You can cancel this order within 2 minutes of purchase. Time
                      remaining:{" "}
                      <strong>
                        {Math.floor(timeLeft[o.id] / 60)}:
                        {String(timeLeft[o.id] % 60).padStart(2, "0")}
                      </strong>
                    </div>
                  )}
                  {o.items && o.items.length > 0 ? (
                    <ul
                      style={{
                        margin: "0",
                        paddingLeft: "20px",
                        color: "#555",
                        fontSize: "13px",
                      }}
                    >
                      {o.items.map((it, idx) => (
                        <li key={idx} style={{ marginBottom: "4px" }}>
                          {it.name} — Qty: {it.quantity} — $
                          {Number(it.price).toFixed(2)} each
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {canCancel(o) && (
                    <button
                      className="ps-btn ps-btn-secondary"
                      onClick={() => setCancelTargetId(o.id)}
                      style={{ padding: "10px 16px" }}
                    >
                      Cancel Order
                    </button>
                  )}
                  {isSuccessfulOrder(o) && !canCancel(o) && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#999",
                        alignSelf: "center",
                      }}
                    >
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

      {cancelTargetId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(31, 24, 19, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
          onClick={() => !cancelling && setCancelTargetId(null)}
        >
          <div
            className="ps-surface"
            style={{
              maxWidth: "420px",
              width: "100%",
              padding: "24px",
              borderRadius: "16px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", color: "#1f1813" }}>
              Cancel order?
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "#65574d", lineHeight: 1.5 }}>
              Are you sure you want to cancel your order?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ps-btn ps-btn-secondary"
                onClick={() => setCancelTargetId(null)}
                disabled={cancelling}
              >
                No
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                onClick={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyOrders;
