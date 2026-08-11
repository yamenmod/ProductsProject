/**
 * CategorySalesChart Component
 * Displays a vertical bar chart of sales by product within a category
 * Uses actual sales data from successful orders
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { STATUS_COLORS } from "../utils/statusColors";

function CategorySalesChart({ session, category, fromDate, toDate }) {
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCategorySales = async () => {
      if (!session?.token || !category) {
        setLoading(false);
        return;
      }

      // Clear previous data when category changes
      setCategoryProducts([]);
      setLoading(true);
      setError("");

      try {
        const params = { category };
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const response = await axios.get("/api/admin/category-sales", {
          headers: { Authorization: `Bearer ${session.token}` },
          params,
        });
        setCategoryProducts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load category sales:", err);
        setError(err.response?.data?.message || "Unable to load category sales");
      } finally {
        setLoading(false);
      }
    };

    loadCategorySales();
  }, [session?.token, category, fromDate, toDate]);

  const getBarColor = (index) => {
    // Cycle through the same colors as the Orders graph
    const colors = [
      STATUS_COLORS.success,
      STATUS_COLORS.completed,
      STATUS_COLORS.cancelled,
    ];
    return colors[index % colors.length];
  };

  const maxQuantity = Math.max(...categoryProducts.map((p) => p.total_sold || 0), 1);

  if (!category) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Sales by Category
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Select a category to view product sales.
        </p>
        <p className="ps-lead">Please select a category above.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Sales by Category: {category}
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Products in this category ranked by units sold from successful orders.
        </p>
        <p className="ps-lead">Loading category sales...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Sales by Category: {category}
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Products in this category ranked by units sold from successful orders.
        </p>
        <p className="ps-lead" style={{ color: "#991b1b" }}>
          {error}
        </p>
      </div>
    );
  }

  if (categoryProducts.length === 0) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Sales by Category: {category}
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Products in this category ranked by units sold from successful orders.
        </p>
        <p className="ps-lead">
          No products found in this category.
        </p>
      </div>
    );
  }

  // Check if all products have 0 sales
  const allZeroSales = categoryProducts.every((p) => (p.total_sold || 0) === 0);

  if (allZeroSales) {
    return (
      <div className="ps-surface" style={{ padding: "22px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
          Sales by Category: {category}
        </h2>
        <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
          Products in this category ranked by units sold from successful orders.
        </p>
        <p className="ps-lead">
          No sales recorded for products in this category during the selected date range.
        </p>
      </div>
    );
  }

  return (
    <div className="ps-surface" style={{ padding: "22px" }}>
      <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
        Sales by Category: {category}
      </h2>
      <p style={{ margin: "0 0 18px", color: "#5e5148" }}>
        Products in this category ranked by units sold from successful orders.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          gap: "16px",
          paddingTop: "50px",
          paddingBottom: "20px",
          height: "350px",
          overflowX: "auto",
        }}
      >
        {categoryProducts.map((product, index) => {
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
                flex: "0 0 auto",
                minWidth: "80px",
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
                  width: "60px",
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
                  maxWidth: "100px",
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

export default CategorySalesChart;
