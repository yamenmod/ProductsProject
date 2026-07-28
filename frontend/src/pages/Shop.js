/**
 * Shop Page
 * Product catalog page displaying all available products
 * Features category navigation and product card display with hover effects
 */
import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./Shop.css";

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

      <main className="ps-main shop-page-main">
        <div className="ps-shell">
          <div className="shop-hero">
            <p className="ps-pill">Our collection</p>
            <h1 className="ps-title">Choose your gear</h1>
            <p className="ps-lead">
              Every category now follows the Plage Surf visual style with warm
              sand surfaces and sea-toned accents.
            </p>
          </div>

          <div className="shop-grid">
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
                className="ps-surface shop-card"
                onClick={() => onNavigate("products", item.id)}
              >
                <div
                  className="shop-card-icon"
                  style={{ color: item.color }}
                >
                  {item.icon}
                </div>
                <h3 className="shop-card-title">
                  {item.name}
                </h3>
                <p className="shop-card-description">
                  {item.desc}
                </p>

                {item.id === "wetsuits" && hoveredCardId === item.id && (
                  <div className="shop-card-extra">
                    <p className="shop-card-extra-label">
                      Rip Curl Size Charts
                    </p>
                    <button
                      type="button"
                      className="shop-card-extra-button"
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
                  type="button"
                  className="ps-btn ps-btn-primary shop-card-action"
                >
                  Shop now
                </button>
              </div>
            ))}
          </div>

          <div className="ps-surface shop-cta-panel">
            <h2 className="shop-cta-title">
              Build your next setup
            </h2>
            <p className="shop-cta-description">
              Open any category or browse all products in the redesigned Plage
              Surf catalog view.
            </p>
            <button
              onClick={() => onNavigate("products", "")}
              className="ps-btn ps-btn-primary shop-cta-button"
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
