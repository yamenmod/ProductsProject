import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { STATUS_COLORS } from "../utils/statusColors";
import { getOrderBucket, ORDER_STATUS_LABELS } from "../utils/orderStatus";
import { resetVatRateCache } from "../utils/pricing";

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

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vatRatePercent, setVatRatePercent] = useState(0);
  const [vatInput, setVatInput] = useState("0");
  const [vatMessage, setVatMessage] = useState("");
  const [savingVat, setSavingVat] = useState(false);
  const [maxQtyPerProduct, setMaxQtyPerProduct] = useState(10);
  const [maxQtyInput, setMaxQtyInput] = useState("10");
  const [maxQtyMessage, setMaxQtyMessage] = useState("");
  const [savingMaxQty, setSavingMaxQty] = useState(false);
  const [watchlistSearch, setWatchlistSearch] = useState("");
  const statusColors = STATUS_COLORS;

  const filteredOrders = useMemo(() => {
    const fromTime = dateFrom
      ? new Date(`${dateFrom}T00:00:00`).getTime()
      : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return orders.filter((order) => {
      const createdAt = new Date(
        order?.createdAt || order?.created_at || 0,
      ).getTime();

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
    const summary = { success: 0, cancelled: 0, completed: 0 };

    orders.forEach((order) => {
      summary[getOrderBucket(order)] += 1;
    });

    return {
      success: summary.success,
      cancelled: summary.cancelled,
      completed: summary.completed,
    };
  }, [orders]);

  const statusChartData = useMemo(
    () => [
      {
        key: "success",
        label: ORDER_STATUS_LABELS.success,
        value: filteredSummary.success,
        color: statusColors.success,
      },
      {
        key: "cancelled",
        label: ORDER_STATUS_LABELS.cancelled,
        value: filteredSummary.cancelled,
        color: statusColors.cancelled,
      },
      {
        key: "completed",
        label: ORDER_STATUS_LABELS.completed,
        value: filteredSummary.completed,
        color: statusColors.success,
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
    () => {
      const THRESHOLD = 4;
      const normalizedSearch = (watchlistSearch || "").toString().trim().toLowerCase();

      return [...products]
        .map((product) => {
          const stock = Number(product?.stock ?? 0);
          const sizeStock = product?.sizeStock || product?.size_stock || null;

          let lowSizes = null;

          if (sizeStock && typeof sizeStock === "object") {
            lowSizes = Object.entries(sizeStock)
              .filter(([, qty]) => Number(qty) >= 0 && Number(qty) <= THRESHOLD)
              .map(([size, qty]) => ({ size, qty: Number(qty) }));
          }

          const overallLow = stock >= 0 && stock <= THRESHOLD;

          return {
            product,
            overallLow,
            lowSizes: lowSizes && lowSizes.length ? lowSizes : [],
            stock,
          };
        })
        .filter((entry) => entry.overallLow || (entry.lowSizes && entry.lowSizes.length))
        .filter((entry) => {
          if (!normalizedSearch) return true;
          return (entry.product?.name || "")
            .toString()
            .toLowerCase()
            .includes(normalizedSearch);
        })
        .sort((a, b) => a.stock - b.stock);
    },
    [products, watchlistSearch],
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

  useEffect(() => {
    const loadVat = async () => {
      if (!session?.token) {
        return;
      }

      try {
        const response = await axios.get("/api/admin/settings/vat_rate", {
          headers: { Authorization: `Bearer ${session.token}` },
        });

        console.log("[vat:settings-response]", response.data);

        const storedDecimal = Number(response.data?.value || 0);
        const percent = Math.round(storedDecimal * 100);
        console.log("[vat:dashboard-state]", { storedDecimal, percent });
        setVatRatePercent(percent);
        setVatInput(String(percent));
      } catch (vatError) {
        console.error("Unable to load VAT rate:", vatError.message);
      }
    };

    loadVat();
  }, [session?.token]);

  useEffect(() => {
    const loadMaxQtyPerProduct = async () => {
      if (!session?.token) {
        return;
      }

      try {
        const response = await axios.get(
          "/api/admin/settings/max_quantity_per_cart",
          {
            headers: { Authorization: `Bearer ${session.token}` },
          },
        );

        const value = Number(response.data?.value || 10);
        const normalized = Number.isFinite(value) && value > 0 ? value : 10;
        setMaxQtyPerProduct(normalized);
        setMaxQtyInput(String(normalized));
      } catch (maxQtyError) {
        console.error("Unable to load max quantity per product:", maxQtyError.message);
      }
    };

    loadMaxQtyPerProduct();
  }, [session?.token]);

  const saveVatRate = async () => {
    const parsedPercent = Number(vatInput);

    if (
      !Number.isFinite(parsedPercent) ||
      parsedPercent < 1 ||
      parsedPercent > 99
    ) {
      setVatMessage("VAT must be between 1% and 99%.");
      return;
    }

    try {
      setSavingVat(true);
      setVatMessage("");

      const response = await axios.put(
        "/api/admin/settings/vat_rate",
        { value: parsedPercent },
        {
          headers: { Authorization: `Bearer ${session.token}` },
        },
      );

      const storedDecimal = Number(response.data?.value || parsedPercent / 100);
      const savedPercent = Math.round(storedDecimal * 100);
      console.log("[vat:dashboard-save]", { storedDecimal, savedPercent });
      setVatRatePercent(savedPercent);
      setVatInput(String(savedPercent));
      resetVatRateCache();
      setVatMessage(`VAT updated to ${savedPercent}%.`);
    } catch (saveError) {
      setVatMessage(saveError.response?.data?.error || "Unable to update VAT.");
    } finally {
      setSavingVat(false);
    }
  };

  const saveMaxQtyPerProduct = async () => {
    const parsed = Number(maxQtyInput);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000) {
      setMaxQtyMessage("Max quantity per cart must be between 1 and 1000.");
      return;
    }

    try {
      setSavingMaxQty(true);
      setMaxQtyMessage("");

      const response = await axios.put(
        "/api/admin/settings/max_quantity_per_cart",
        { value: parsed },
        {
          headers: { Authorization: `Bearer ${session.token}` },
        },
      );

      const saved = Number(response.data?.value || parsed);
      setMaxQtyPerProduct(saved);
      setMaxQtyInput(String(saved));
      setMaxQtyMessage(`Max quantity per cart updated to ${saved}.`);
    } catch (saveError) {
      setMaxQtyMessage(saveError.response?.data?.error || "Unable to update max quantity per cart.");
    } finally {
      setSavingMaxQty(false);
    }
  };

  const openOrders = (filter) => {
    if (typeof onOpenOrders === "function") {
      onOpenOrders(filter);
      return;
    }

    onNavigate("manage-orders", filter);
  };

  const openProductEdit = async (product) => {
    try {
      const productId = product._id || product.id;
      const res = await axios.get(`/api/products/${productId}`);
      onNavigate("manage-products", res.data);
    } catch (error) {
      console.error("Failed to fetch product for editing:", error);
      onNavigate("manage-products", product);
    }
  };

  const cards = [
    {
      key: "success",
      label: ORDER_STATUS_LABELS.success,
      value: filteredSummary.success,
      color: statusColors.success,
      filter: "success",
    },
    {
      key: "cancelled",
      label: ORDER_STATUS_LABELS.cancelled,
      value: filteredSummary.cancelled,
      color: statusColors.cancelled,
      filter: "cancelled",
    },
    {
      key: "completed",
      label: ORDER_STATUS_LABELS.completed,
      value: filteredSummary.completed,
      color: statusColors.success,
      filter: "completed",
    },
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
            <h1
              className="ps-title"
              style={{
                marginBottom: "8px",
                fontSize: "clamp(24px, 3vw, 34px)",
              }}
            >
              Welcome, admin
            </h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              Track order health at a glance and watch products that are close
              to running out of stock.
            </p>
          </div>

          <div
            className="ps-surface"
            style={{
              padding: "18px 20px",
              marginBottom: "22px",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: "180px", flex: "0 0 auto" }}>
              <div
                style={{
                  color: "#65574d",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                From
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(31, 24, 19, 0.14)",
                  background: "rgba(255, 250, 242, 0.95)",
                  fontSize: "13px",
                  height: "44px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ minWidth: "180px", flex: "0 0 auto" }}>
              <div
                style={{
                  color: "#65574d",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                To
              </div>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(31, 24, 19, 0.14)",
                  background: "rgba(255, 250, 242, 0.95)",
                  fontSize: "13px",
                  height: "44px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="button"
              className="ps-btn ps-btn-secondary"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              style={{ height: "44px", flex: "0 0 auto" }}
            >
              Clear range
            </button>
            <div style={{ minWidth: "220px", flex: "1 1 220px" }}>
              <div
                style={{
                  color: "#65574d",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                VAT (%)
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={vatInput}
                  onChange={(event) => setVatInput(event.target.value)}
                  style={{
                    flex: 1,
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(31, 24, 19, 0.14)",
                    background: "rgba(255, 250, 242, 0.95)",
                    fontSize: "13px",
                    height: "44px",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={saveVatRate}
                  disabled={savingVat}
                  style={{ height: "44px", minWidth: "88px", flex: "0 0 auto" }}
                >
                  {savingVat ? "Saving" : "Save"}
                </button>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: vatMessage
                    ? vatMessage.includes("updated")
                      ? "#245860"
                      : "#a83f34"
                    : "#65574d",
                  marginTop: "6px",
                }}
              >
                {vatMessage || `Current VAT: ${vatRatePercent}%`}
              </div>
            </div>
            <div style={{ minWidth: "220px", flex: "1 1 220px" }}>
              <div
                style={{
                  color: "#65574d",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                Max quantity per product
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxQtyInput}
                  onChange={(event) => setMaxQtyInput(event.target.value)}
                  style={{
                    flex: 1,
                    padding: "11px 12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(31, 24, 19, 0.14)",
                    background: "rgba(255, 250, 242, 0.95)",
                    fontSize: "13px",
                    height: "44px",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={saveMaxQtyPerProduct}
                  disabled={savingMaxQty}
                  style={{ height: "44px", minWidth: "88px", flex: "0 0 auto" }}
                >
                  {savingMaxQty ? "Saving" : "Save"}
                </button>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: maxQtyMessage
                    ? maxQtyMessage.includes("updated")
                      ? "#245860"
                      : "#a83f34"
                    : "#65574d",
                  marginTop: "6px",
                }}
              >
                {maxQtyMessage || `Current limit: ${maxQtyPerProduct}`}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            {cards.map((item) => (
              <button
                key={item.key}
                type="button"
                className="ps-surface"
                onClick={() => openOrders(item.filter)}
                style={{
                  padding: "18px 20px",
                  border: `1px solid ${item.color}33`,
                  textAlign: "left",
                  cursor: "pointer",
                  background: `${item.color}14`,
                  boxShadow: `0 14px 28px ${item.color}10`,
                }}
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
                    fontSize: "52px",
                    lineHeight: 1,
                    marginTop: "8px",
                    color: item.color,
                  }}
                >
                  {loading ? "..." : item.value}
                </div>
                <div
                  style={{
                    color: item.color,
                    fontSize: "13px",
                    marginTop: "6px",
                    fontWeight: 700,
                  }}
                >
                  {item.key === "range"
                    ? "Orders between the selected dates"
                    : "Tap to open the matching orders"}
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.9fr)",
              gap: "16px",
            }}
          >
            <div className="ps-surface" style={{ padding: "22px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "18px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                  <h2 style={{ margin: "0 0 8px", fontSize: "24px" }}>
                    Stock watchlist
                  </h2>
                  <p style={{ margin: "0 0 12px", color: "#5e5148" }}>
                    Out of stock products first, then products with 1 to 4 units
                    remaining.
                  </p>
                  <input
                    type="search"
                    value={watchlistSearch}
                    onChange={(event) => setWatchlistSearch(event.target.value)}
                    placeholder="Search watchlist by product name"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid rgba(31, 24, 19, 0.14)",
                      background: "rgba(255, 250, 242, 0.95)",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={() => onNavigate("manage-products")}
                  style={{ height: "44px", whiteSpace: "nowrap" }}
                >
                  Open products
                </button>
              </div>

              {loading ? (
                <p className="ps-lead">Loading inventory...</p>
              ) : lowStockProducts.length ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  {lowStockProducts.map((entry) => {
                    const product = entry.product || {};
                    const stock = Number(entry.stock ?? 0);
                    const hasLowSizes = Array.isArray(entry.lowSizes) && entry.lowSizes.length;
                    const statusLabel =
                      stock === 0 && !hasLowSizes ? "Out of stock" : "Low stock";
                    const statusColor = stock === 0 && !hasLowSizes ? "#a83f34" : "#245860";

                    return (
                      <div
                        key={product.id || product._id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "14px",
                          background: "rgba(36, 88, 96, 0.06)",
                          border: "1px solid rgba(36, 88, 96, 0.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                          }}
                        >
                          <strong>{product.name}</strong>
                          <span style={{ color: statusColor, fontWeight: 800 }}>
                            {statusLabel}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginTop: "6px",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ color: "#5e5148", fontSize: "13px" }}>
                            {product.category || "Uncategorized"}
                            {hasLowSizes ? (
                              <div style={{ marginTop: 6 }}>
                                <strong style={{ fontSize: 13 }}>Low sizes:</strong>{" "}
                                {entry.lowSizes
                                  .map((s) => `${s.size}(${s.qty})`)
                                  .join(", ")}
                              </div>
                            ) : null}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              className="ps-btn ps-btn-secondary"
                              onClick={() => openProductEdit(product)}
                              style={{ padding: "8px 12px", fontSize: "12px" }}
                            >
                              Edit
                            </button>
                            {!hasLowSizes ? (
                              <span style={{ color: "#245860", fontWeight: 700 }}>
                                Stock {stock}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="ps-lead">
                  No products are currently out of stock or low on stock (1-4
                  units).
                </p>
              )}
            </div>

            <div className="ps-surface" style={{ padding: "22px" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
                Orders graph
              </h2>
              <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
                Orders shown by status for the selected date range.
              </p>

              {statusChartData.some((item) => item.value > 0) ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 280px) 1fr",
                    gap: "18px",
                    alignItems: "center",
                    paddingTop: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        width: "220px",
                        height: "220px",
                        borderRadius: "50%",
                        background: `conic-gradient(${statusChartData
                          .map((item, index) => {
                            const total =
                              statusChartData.reduce(
                                (sum, entry) => sum + entry.value,
                                0,
                              ) || 1;
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
                      <div
                        key={item.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "12px 14px",
                          borderRadius: "14px",
                          background: "rgba(255, 250, 242, 0.9)",
                          border: "1px solid rgba(31, 24, 19, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "999px",
                              background: item.color,
                              display: "inline-block",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#1f1813",
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "20px",
                            fontWeight: 800,
                            color: item.color,
                            lineHeight: 1,
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="ps-lead">
                  No orders found for the selected dates.
                </p>
              )}

              {error ? (
                <div
                  className="ps-surface"
                  style={{ marginTop: "18px", padding: "16px 18px" }}
                >
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
