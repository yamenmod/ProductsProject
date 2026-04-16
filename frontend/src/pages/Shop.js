import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Shop({
  user,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
}) {
  const [hoveredCardId, setHoveredCardId] = useState(null);

  return (
    <div className="ps-page">
      <Header
        user={user}
        preferredGender={preferredGender}
        onPreferredGenderChange={onPreferredGenderChange}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartCount}
      />

      <main className="ps-main" style={{ padding: "70px 0" }}>
        <div className="ps-shell">
          <div style={{ textAlign: "center", marginBottom: "54px" }}>
            <p className="ps-pill" style={{ marginBottom: "12px" }}>
              Our collection
            </p>
            <h1 className="ps-title" style={{ marginBottom: "10px" }}>
              Choose your gear
            </h1>
            <p
              className="ps-lead"
              style={{ maxWidth: "650px", margin: "0 auto" }}
            >
              Every category now follows the Plage Surf visual style with warm
              sand surfaces and sea-toned accents.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "22px",
              marginBottom: "48px",
            }}
          >
            {[
              {
                name: "Surfboards",
                desc: "High-performance boards for every skill level",
                color: "#245860",
                id: "surfboards",
                icon: "Board",
              },
              {
                name: "Wetsuits",
                desc: "Premium wetsuits for warmth and mobility",
                color: "#3b6f77",
                id: "wetsuits",
                icon: "Suit",
              },
              {
                name: "Clothing",
                desc: "Stylish and comfortable beachwear",
                color: "#7d674c",
                id: "clothing",
                icon: "Wear",
              },
              {
                name: "Surfboard Accessories",
                desc: "Premium accessories and gear",
                color: "#c77a4a",
                id: "surfboard accessories",
                icon: "Add-on",
              },
            ].map((item) => (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredCardId(item.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                className="ps-surface"
                style={{
                  padding: "30px 24px",
                  borderRadius: "16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow =
                    "0 16px 30px rgba(76, 56, 38, 0.2)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 18px 42px rgba(67, 48, 33, 0.12)";
                }}
                onClick={() => onNavigate("products", item.id)}
              >
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: "16px",
                    fontWeight: "800",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: "31px",
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    letterSpacing: "0.8px",
                    color: "#1f1813",
                    margin: "0 0 12px 0",
                  }}
                >
                  {item.name}
                </h3>
                <p
                  style={{
                    color: "#65574d",
                    fontSize: "14px",
                    margin: "0 0 24px 0",
                    lineHeight: "1.6",
                  }}
                >
                  {item.desc}
                </p>

                {item.id === "wetsuits" && hoveredCardId === item.id && (
                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                      marginBottom: "16px",
                      padding: "14px",
                      borderRadius: "14px",
                      background: "rgba(255, 250, 242, 0.92)",
                      border: "1px solid rgba(31, 24, 19, 0.08)",
                      boxShadow: "0 14px 28px rgba(67, 48, 33, 0.12)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#245860",
                        fontSize: "11px",
                        fontWeight: "800",
                        letterSpacing: "1.2px",
                        textTransform: "uppercase",
                      }}
                    >
                      Rip Curl Size Charts
                    </p>
                    <button
                      type="button"
                      style={{
                        padding: "10px 16px",
                        background: "#ffffff",
                        color: "#245860",
                        border: "1px solid #245860",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "800",
                        fontSize: "13px",
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onNavigate("size-charts", "wetsuits");
                      }}
                    >
                      View Size Charts
                    </button>
                  </div>
                )}

                <button
                  style={{
                    padding: "10px 24px",
                    background: item.color,
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
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

          <div
            className="ps-surface"
            style={{
              padding: "44px 30px",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: "52px",
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                letterSpacing: "1px",
                margin: "0 0 16px 0",
              }}
            >
              Build your next setup
            </h2>
            <p
              style={{
                color: "#65574d",
                fontSize: "15px",
                margin: "0 0 24px 0",
                lineHeight: "1.6",
              }}
            >
              Open any category or browse all products in the redesigned Plage
              Surf catalog view.
            </p>
            <button
              onClick={() => onNavigate("products", "")}
              className="ps-btn ps-btn-primary"
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
      </main>

      <Footer />
    </div>
  );
}

export default Shop;
