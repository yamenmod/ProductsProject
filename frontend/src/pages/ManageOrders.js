import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const [selectedFilter, setSelectedFilter] = useState(initialFilter || "all");
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  useEffect(() => {
    setSelectedFilter(initialFilter || "all");
  }, [initialFilter]);

  const normalizeStatus = (value) => (value || "").toString().trim().toLowerCase();

  const getOrderBucket = useCallback((order) => {
    const status = normalizeStatus(order?.status);

    if (["paid", "success", "successful", "completed"].includes(status)) {
      return "success";
    }

    if (["pending", "processing", "awaiting_payment", "open", "draft"].includes(status)) {
      return "pending";
    }

    return "unsuccessful";
  }, []);

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
        setError(requestError.response?.data?.message || "Unable to load orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [session?.token]);

  const loadOrderDetail = useCallback(async (orderId) => {
    setLoadingOrderDetail(true);

    try {
      const response = await axios.get(`/api/cart/admin/orders/${orderId}/items`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      setSelectedOrderDetail(response.data);
    } catch (requestError) {
      console.error("Unable to load order details:", requestError);
      setSelectedOrderDetail(null);
    } finally {
      setLoadingOrderDetail(false);
    }
  }, [session?.token]);

  const handleOrderRowClick = (order) => {
    loadOrderDetail(order.id);
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
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

      const matchesSearch = !normalizedSearch
        ? true
        : [order.id, order.username, order.email]
            .filter(Boolean)
            .some((value) => value.toString().toLowerCase().includes(normalizedSearch));

      const matchesFilter = selectedFilter === "all" ? true : getOrderBucket(order) === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [orders, searchTerm, selectedFilter, getOrderBucket, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const counts = { success: 0, unsuccessful: 0, pending: 0 };

    orders.forEach((order) => {
      counts[getOrderBucket(order)] += 1;
    });

    return counts;
  }, [orders, getOrderBucket]);

  const statusTone = (bucket) => {
    if (bucket === "success") {
      return { background: "rgba(36, 88, 96, 0.12)", color: "#245860" };
    }

    if (bucket === "unsuccessful") {
      return { background: "rgba(168, 63, 52, 0.12)", color: "#a83f34" };
    }

    return { background: "rgba(100, 116, 139, 0.12)", color: "#475569" };
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
  };

  const getFilterButtonStyle = (itemKey) => {
    const isSelected = selectedFilter === itemKey;

    const activeBackground = {
      all: "linear-gradient(135deg,#245860,#2f747d)",
      success: "linear-gradient(135deg,#16515e,#1f5d74)",
      unsuccessful: "linear-gradient(135deg,#7b2f27,#a83f34)",
      pending: "linear-gradient(135deg,#4b5b6b,#1f2937)",
    };

    return {
      background: isSelected ? activeBackground[itemKey] : "rgba(255, 250, 242, 0.88)",
      color: isSelected ? "#fff" : "#1f1813",
      border: "1px solid rgba(31, 24, 19, 0.08)",
      transition: "background 0.2s ease, color 0.2s ease",
    };
  };

  const getSummaryCardStyle = (bucket) => {
    const isSelected = selectedFilter === bucket;

    const baseStyle = {
      padding: "18px 20px",
      border: "1px solid rgba(31, 24, 19, 0.08)",
      textAlign: "left",
      cursor: "pointer",
      transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
    };

    if (!isSelected) {
      return {
        ...baseStyle,
        background: statusTone(bucket).background,
      };
    }

    const selectedBackground = {
      success: "linear-gradient(135deg,#16515e,#1f5d74)",
      unsuccessful: "linear-gradient(135deg,#7b2f27,#a83f34)",
      pending: "linear-gradient(135deg,#4b5b6b,#1f2937)",
    };

    return {
      ...baseStyle,
      background: selectedBackground[bucket],
      color: "#fff",
      boxShadow: "0 18px 40px rgba(31, 24, 19, 0.18)",
    };
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
            <h1 className="ps-title" style={{ marginBottom: "8px", fontSize: "clamp(24px, 3vw, 34px)" }}>Manage orders</h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              Review every checkout and quickly spot whether the payment ended up success, unsuccessful, or still pending.
            </p>
          </div>

          <div
            className="ps-surface"
            style={{
              padding: "18px 20px",
              marginBottom: "18px",
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Success", value: summary.success, bucket: "success" },
              { label: "Unsuccessful", value: summary.unsuccessful, bucket: "unsuccessful" },
              { label: "Pending", value: summary.pending, bucket: "pending" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="ps-surface"
                onClick={() => setSelectedFilter(item.bucket)}
                style={getSummaryCardStyle(item.bucket)}
              >
                <div style={{ color: selectedFilter === item.bucket ? "rgba(255, 255, 255, 0.85)" : "#65574d", fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: "44px", lineHeight: 1, marginTop: "8px", color: selectedFilter === item.bucket ? "#fff" : statusTone(item.bucket).color }}>
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
                fontSize: "13px",
              }}
            />

            {[
              { key: "all", label: "All" },
              { key: "success", label: "Success" },
              { key: "unsuccessful", label: "Unsuccessful" },
              { key: "pending", label: "Pending" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className="ps-btn"
                onClick={() => setSelectedFilter(item.key)}
                style={getFilterButtonStyle(item.key)}
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
                  <tr style={{ textAlign: "left", color: "#65574d", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.2px" }}>
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
                      <tr
                        key={order.id}
                        onClick={() => handleOrderRowClick(order)}
                        style={{
                          borderTop: "1px solid rgba(31, 24, 19, 0.08)",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(36, 88, 96, 0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <td style={{ padding: "14px 10px", fontWeight: 700, fontSize: "13px" }}>#{order.id}</td>
                        <td style={{ padding: "14px 10px", fontSize: "13px" }}>{order.username || "-"}</td>
                        <td style={{ padding: "14px 10px", color: "#65574d", fontSize: "13px" }}>{order.email || "-"}</td>
                        <td style={{ padding: "14px 10px", fontSize: "13px" }}>{order.itemCount ?? 0}</td>
                        <td style={{ padding: "14px 10px", fontSize: "13px" }}>${Number(order.total ?? 0).toFixed(2)}</td>
                        <td style={{ padding: "14px 10px" }}>
                          <span style={{ display: "inline-flex", padding: "6px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, textTransform: "capitalize", background: tone.background, color: tone.color }}>
                            {bucket}
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px", color: "#65574d", fontSize: "13px" }}>{formatDate(order.createdAt || order.created_at)}</td>
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

      {/* Order Detail Modal */}
      {selectedOrderDetail && (
        <>
          <div
            className="ps-previewBackdrop"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(31, 24, 19, 0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setSelectedOrderDetail(null)}
          >
            <div
              className="ps-previewCard"
              style={{
                background: "#fff",
                borderRadius: "16px",
                boxShadow: "0 20px 60px rgba(31, 24, 19, 0.15)",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "80vh",
                overflow: "auto",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "999px",
                  border: "none",
                  background: "rgba(31, 24, 19, 0.08)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  color: "#1f1813",
                  transition: "background-color 0.2s ease",
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(31, 24, 19, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(31, 24, 19, 0.08)";
                }}
              >
                ×
              </button>

              {/* Modal Content */}
              <div style={{ padding: "32px" }}>
                {loadingOrderDetail ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <p className="ps-lead">Loading order details...</p>
                  </div>
                ) : (
                  <>
                    {/* Order Header */}
                    <div style={{ marginBottom: "32px" }}>
                      <h2 className="ps-subtitle" style={{ marginBottom: "8px" }}>
                        Order #{selectedOrderDetail.order.id}
                      </h2>
                      <p style={{ color: "#65574d", fontSize: "12px", margin: 0 }}>
                        {formatDate(selectedOrderDetail.order.createdAt)}
                      </p>
                    </div>

                    {/* Order Summary */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "20px",
                        marginBottom: "32px",
                        padding: "20px",
                        background: "rgba(36, 88, 96, 0.06)",
                        borderRadius: "12px",
                      }}
                    >
                      <div>
                        <p style={{ color: "#65574d", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px", margin: "0 0 6px 0" }}>
                          Status
                        </p>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 800,
                            textTransform: "capitalize",
                            background: statusTone(getOrderBucket(selectedOrderDetail.order)).background,
                            color: statusTone(getOrderBucket(selectedOrderDetail.order)).color,
                          }}
                        >
                          {getOrderBucket(selectedOrderDetail.order)}
                        </span>
                      </div>

                      <div>
                        <p style={{ color: "#65574d", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px", margin: "0 0 6px 0" }}>
                          Total Amount
                        </p>
                        <p style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#1f1813" }}>
                          ${selectedOrderDetail.order.total.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p style={{ color: "#65574d", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px", margin: "0 0 6px 0" }}>
                          Customer name
                        </p>
                        <p style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#1f1813" }}>
                          {selectedOrderDetail.order.username || `User #${selectedOrderDetail.order.userId}`}
                        </p>
                      </div>

                      <div>
                        <p style={{ color: "#65574d", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px", margin: "0 0 6px 0" }}>
                          Customer email
                        </p>
                        <p style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#1f1813", wordBreak: "break-word" }}>
                          {selectedOrderDetail.order.email || "No email available"}
                        </p>
                      </div>

                      <div>
                        <p style={{ color: "#65574d", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px", margin: "0 0 6px 0" }}>
                          Payment
                        </p>
                        <p style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#1f1813" }}>
                          {selectedOrderDetail.order.payment?.status || selectedOrderDetail.order.status}
                        </p>
                        <p style={{ fontSize: "12px", margin: "4px 0 0", color: "#65574d" }}>
                          {selectedOrderDetail.order.payment?.paypalOrderId
                            ? `PayPal ${selectedOrderDetail.order.payment.paypalOrderId}`
                            : "No PayPal reference"}
                        </p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div style={{ marginBottom: "24px" }}>
                      <h3 style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#65574d", marginBottom: "16px" }}>
                        Order Items
                      </h3>

                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ textAlign: "left", color: "#65574d", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.2px", borderBottom: "1px solid rgba(31, 24, 19, 0.08)" }}>
                              <th style={{ padding: "10px 0", fontWeight: 700 }}>Product</th>
                              <th style={{ padding: "10px 0", fontWeight: 700, textAlign: "right" }}>Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOrderDetail.items.map((item) => (
                              <tr
                                key={item.id}
                                style={{
                                  borderBottom: "1px solid rgba(31, 24, 19, 0.06)",
                                  textAlign: "left",
                                }}
                              >
                                <td style={{ padding: "12px 0", fontSize: "13px" }}>{item.name}</td>
                                <td style={{ padding: "12px 0", textAlign: "right", color: "#65574d" }}>
                                  {item.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div
                      style={{
                        background: "rgba(36, 88, 96, 0.06)",
                        borderRadius: "12px",
                        padding: "16px",
                        marginTop: "24px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                          color: "#65574d",
                        }}
                      >
                        <span>Subtotal:</span>
                        <span>${selectedOrderDetail.order.pricing.basePrice.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          color: "#65574d",
                        }}
                      >
                        <span>VAT (18%):</span>
                        <span>${selectedOrderDetail.order.pricing.vatAmount.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: "12px",
                          borderTop: "1px solid rgba(31, 24, 19, 0.12)",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#1f1813",
                        }}
                      >
                        <span>Total:</span>
                        <span>${selectedOrderDetail.order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}

export default ManageOrders;
