import React, { useState } from "react";

function Header({ user, currentPage, onNavigate, onLogout, cartCount = 0 }) {
  const [shopMenuOpen, setShopMenuOpen] = useState(false);

  return (
    <header
      style={{
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        padding: "16px 0",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 2px 16px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
          }}
          onClick={() => onNavigate("home")}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "900",
              fontSize: "20px",
            }}
          >
            S
          </div>
          <div>
            <h1
              style={{
                margin: "0",
                color: "#0f172a",
                fontSize: "20px",
                fontWeight: "900",
                letterSpacing: "-1px",
              }}
            >
              SURF SHOP
            </h1>
            <p
              style={{
                margin: "0",
                color: "#64748b",
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              Premium Gear
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            display: "flex",
            gap: "40px",
            alignItems: "center",
            position: "relative",
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate("home")}
            style={{
              background: "transparent",
              border: "none",
              color: currentPage === "home" ? "#0ea5e9" : "#475569",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "color 0.3s ease",
              borderBottom:
                currentPage === "home" ? "2px solid #0ea5e9" : "none",
              paddingBottom: "4px",
            }}
            onMouseOver={(e) => {
              if (currentPage !== "home") e.target.style.color = "#0f172a";
            }}
            onMouseOut={(e) => {
              if (currentPage !== "home") e.target.style.color = "#475569";
            }}
          >
            Home
          </button>

          {/* Shop Dropdown */}
          <div
            style={{
              position: "relative",
            }}
            onMouseEnter={() => setShopMenuOpen(true)}
            onMouseLeave={() => setShopMenuOpen(false)}
          >
            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color:
                  currentPage === "shop" || currentPage === "products"
                    ? "#0ea5e9"
                    : "#475569",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "color 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom:
                  currentPage === "shop" || currentPage === "products"
                    ? "2px solid #0ea5e9"
                    : "none",
                paddingBottom: "4px",
              }}
              onMouseOver={(e) => {
                if (currentPage !== "shop" && currentPage !== "products") {
                  e.currentTarget.style.color = "#0f172a";
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== "shop" && currentPage !== "products") {
                  e.currentTarget.style.color = "#475569";
                }
              }}
            >
              Shop
              <span
                style={{
                  fontSize: "12px",
                  transform: shopMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                minWidth: "220px",
                marginTop: "8px",
                opacity: shopMenuOpen ? 1 : 0,
                visibility: shopMenuOpen ? "visible" : "hidden",
                transform: shopMenuOpen ? "translateY(0)" : "translateY(-8px)",
                transition: "all 0.3s ease",
                zIndex: 1001,
              }}
            >
              {[
                { name: "Surfboards", id: "surfboards" },
                { name: "Wetsuits", id: "wetsuits" },
                { name: "Clothing", id: "clothing" },
                { name: "Surfboard Accessories", id: "accessories" },
              ].map((category, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    onNavigate("products", category.id);
                    setShopMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "white",
                    border: "none",
                    display: "block",
                    padding: "12px 20px",
                    color: "#475569",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    borderBottom: idx < 3 ? "1px solid #f1f5f9" : "none",
                    borderRadius:
                      idx === 0
                        ? "8px 8px 0 0"
                        : idx === 3
                          ? "0 0 8px 8px"
                          : "0",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.color = "#0ea5e9";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.color = "#475569";
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("contact")}
            style={{
              background: "transparent",
              border: "none",
              color: currentPage === "contact" ? "#0ea5e9" : "#475569",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "color 0.3s ease",
              borderBottom:
                currentPage === "contact" ? "2px solid #0ea5e9" : "none",
              paddingBottom: "4px",
            }}
            onMouseOver={(e) => {
              if (currentPage !== "contact") e.target.style.color = "#0f172a";
            }}
            onMouseOut={(e) => {
              if (currentPage !== "contact") e.target.style.color = "#475569";
            }}
          >
            Contact
          </button>
        </nav>

        {/* User Menu */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#334155",
                fontWeight: "600",
                letterSpacing: "0.2px",
              }}
            >
              {user.username}
            </div>
            {user.role === "user" && (
              <button
                onClick={() => onNavigate("cart")}
                style={{
                  padding: "10px 14px",
                  background:
                    "linear-gradient(135deg, #eff8ff 0%, #f8fbff 100%)",
                  border: "1px solid #bfdbfe",
                  borderRadius: "999px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "13px",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  color: "#0369a1",
                  position: "relative",
                  boxShadow: "0 8px 20px rgba(14, 165, 233, 0.08)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#7dd3fc";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, #eff8ff 0%, #f8fbff 100%)";
                  e.currentTarget.style.borderColor = "#bfdbfe";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "999px",
                    background: "rgba(14, 165, 233, 0.12)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                  }}
                >
                  🛒
                </span>
                <span>Cart</span>
                {cartCount > 0 && (
                  <span
                    style={{
                      background: "#0ea5e9",
                      color: "white",
                      borderRadius: "50%",
                      minWidth: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: "700",
                      position: "absolute",
                      right: "-7px",
                      top: "-7px",
                      border: "2px solid white",
                      padding: "0 4px",
                    }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: "8px 16px",
              background: "#f1f5f9",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.target.style.background = "#e2e8f0";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "#f1f5f9";
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
