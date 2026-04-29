import React, { useEffect, useState } from "react";
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
}) {
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError("");

      try {
        const token = session?.token;
        const [productsRes, customersRes, ordersRes] = await Promise.all([
          axios.get("/api/products"),
          axios.get("/api/admin/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("/api/cart/admin/orders", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStats({
          products: Array.isArray(productsRes.data) ? productsRes.data.length : 0,
          customers: Array.isArray(customersRes.data) ? customersRes.data.length : 0,
          orders: Array.isArray(ordersRes.data) ? ordersRes.data.length : 0,
        });
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
  }, [session.token]);

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
            <p className="ps-pill" style={{ marginBottom: "12px" }}>
              Admin dashboard
            </p>
            <h1 className="ps-title" style={{ marginBottom: "10px" }}>
              Welcome, admin
            </h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              This admin portal only shows the product, customer, and order
              management tools. Customer-facing pages are hidden from admin users.
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
              { label: "Products", value: stats.products },
              { label: "Customers", value: stats.customers },
              { label: "Orders", value: stats.orders },
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
                  {loading ? "..." : item.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "20px" }}>
            {error ? (
              <div className="ps-surface" style={{ padding: "18px 20px" }}>
                <p style={{ margin: 0, color: "#991b1b" }}>{error}</p>
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            {[
              {
                title: "Manage Products",
                description: "Create, edit, and remove products from the catalogue.",
                action: () => onNavigate("manage-products"),
              },
              {
                title: "Manage Orders",
                description: "Review orders, payment statuses, and order history.",
                action: () => onNavigate("manage-orders"),
              },
              {
                title: "Manage Customers",
                description: "See registered customers and keep the customer list clean.",
                action: () => onNavigate("manage-customers"),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="ps-surface"
                style={{ padding: "24px" }}
              >
                <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
                  {card.title}
                </h2>
                <p style={{ margin: "0 0 20px", color: "#5e5148" }}>
                  {card.description}
                </p>
                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={card.action}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AdminDashboard;
