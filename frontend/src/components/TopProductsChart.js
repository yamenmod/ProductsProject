/**
 * TopProductsChart Component
 * Displays a vertical bar chart of the top 3 most bought products
 * Uses actual sales data from completed/successful orders
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { STATUS_COLORS } from "../utils/statusColors";

function TopProductsChart({ session, fromDate, toDate }) {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTopProducts = async () => {
      if (!session?.token) {
        setLoading(false);
        return;
      }

      try {
        const params = {};
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const response = await axios.get("/api/admin/top-products", {
          headers: { Authorization: `Bearer ${session.token}` },
          params,
        });
        setTopProducts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load top products:", err);
        setError("Unable to load top products");
      } finally {
        setLoading(false);
      }
    };

    loadTopProducts();
  }, [session?.token, fromDate, toDate]);

  const getBarColor = (index) => {
    // Use the same colors as the Orders graph
    if (index === 0) return STATUS_COLORS.success; // #79b64a - green for #1
    if (index === 1) return STATUS_COLORS.completed; // #6FBEB2 - teal for #2
    if (index === 2) return STATUS_COLORS.cancelled; // #f07c2e - orange for #3
    return "#65574d";
  };

  const maxQuantity = Math.max(...topProducts.map((p) => p.total_sold || 0), 1);

  if (loading) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Top 3 Most Bought Products
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Products ranked by total units sold from successful orders.
        </p>
        <p className="ps-lead">Loading top products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Top 3 Most Bought Products
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Products ranked by total units sold from successful orders.
        </p>
        <p className="ps-lead" style={{ color: "#991b1b" }}>
          {error}
        </p>
      </div>
    );
  }

  if (topProducts.length === 0) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Top 3 Most Bought Products
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Products ranked by total units sold from successful orders.
        </p>
        <p className="ps-lead">
          No products have been purchased yet.
        </p>
      </div>
    );
  }

  return (
    <div className="ps-surface" style={{ padding: "22px" }}>
      <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
        Top 3 Most Bought Products
      </h2>
      <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
        Products ranked by total units sold from successful orders.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          gap: "20px",
          paddingTop: "30px",
          paddingBottom: "20px",
          height: "300px",
        }}
      >
        {topProducts.map((product, index) => {
          const quantity = product.total_sold || 0;
          const barHeight = (quantity / maxQuantity) * 100;
          const color = getBarColor(index);

          return (
            <div
              key={product.product_id || index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: color,
                  marginBottom: "16px",
                  lineHeight: 1,
                }}
              >
                {quantity}
              </div>
              <div
                style={{
                  width: "100%",
                  maxWidth: "80px",
                  height: "200px",
                  background: "rgba(31, 24, 19, 0.06)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-end",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${barHeight}%`,
                    background: color,
                    borderRadius: "8px",
                    transition: "height 0.3s ease",
                    minHeight: quantity > 0 ? "20px" : "0",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#1f1813",
                  textAlign: "center",
                  width: "100%",
                  maxWidth: "120px",
                  lineHeight: 1.3,
                  wordWrap: "break-word",
                }}
              >
                {product.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TopProductsChart;
