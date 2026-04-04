import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Shop({ user, currentPage, onNavigate, onLogout, cartCount = 0 }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <Header
        user={user}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartCount}
      />

      {/* Main Content */}
      <div style={{ flex: 1, padding: "80px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Page Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "80px",
            }}
          >
            <p
              style={{
                color: "#0ea5e9",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "2px",
                textTransform: "uppercase",
                margin: "0 0 16px 0",
              }}
            >
              Our Collection
            </p>
            <h1
              style={{
                fontSize: "52px",
                fontWeight: "900",
                color: "#0f172a",
                margin: "0 0 24px 0",
                letterSpacing: "-1px",
              }}
            >
              Choose Your Gear
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: "18px",
                margin: "0",
                maxWidth: "600px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.6",
              }}
            >
              Discover our carefully curated collection of premium surfing
              products. Each category offers quality gear for every level of
              surfer.
            </p>
          </div>

          {/* Category Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "32px",
              marginBottom: "80px",
            }}
          >
            {[
              {
                name: "Surfboards",
                desc: "High-performance boards for every skill level",
                color: "#0ea5e9",
                id: "surfboards",
                icon: "S",
              },
              {
                name: "Wetsuits",
                desc: "Premium wetsuits for warmth and mobility",
                color: "#06b6d4",
                id: "wetsuits",
                icon: "W",
              },
              {
                name: "Clothing",
                desc: "Stylish and comfortable beachwear",
                color: "#0d9488",
                id: "clothing",
                icon: "C",
              },
              {
                name: "Surfboard Accessories",
                desc: "Premium accessories and gear",
                color: "#0284c7",
                id: "accessories",
                icon: "A",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "48px 32px",
                  background:
                    "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 50px rgba(0, 0, 0, 0.1)";
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, white 0%, #f8fafc 100%)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)";
                }}
                onClick={() => onNavigate("products", item.id)}
              >
                <div
                  style={{
                    fontSize: "56px",
                    marginBottom: "20px",
                    fontWeight: "900",
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: "800",
                    color: "#0f172a",
                    margin: "0 0 12px 0",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {item.name}
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "14px",
                    margin: "0 0 24px 0",
                    lineHeight: "1.6",
                  }}
                >
                  {item.desc}
                </p>
                <button
                  style={{
                    padding: "12px 28px",
                    background: item.color,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "13px",
                    transition: "all 0.2s ease",
                    letterSpacing: "0.5px",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = "scale(1.05)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  Browse
                </button>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div
            style={{
              padding: "60px 40px",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              borderRadius: "12px",
              textAlign: "center",
              color: "white",
            }}
          >
            <h2
              style={{
                fontSize: "32px",
                fontWeight: "900",
                margin: "0 0 16px 0",
                letterSpacing: "-0.5px",
              }}
            >
              Find Your Perfect Gear
            </h2>
            <p
              style={{
                fontSize: "16px",
                margin: "0 0 24px 0",
                lineHeight: "1.6",
                opacity: "0.95",
              }}
            >
              Browse our complete collection and start your next adventure.
              Click on any category to view products.
            </p>
            <button
              onClick={() => onNavigate("products", "")}
              style={{
                padding: "12px 32px",
                background: "white",
                color: "#0ea5e9",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
                transition: "all 0.2s ease",
                letterSpacing: "0.5px",
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "scale(1)";
              }}
            >
              View All Products
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Shop;
