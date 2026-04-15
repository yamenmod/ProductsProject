import React, { useState } from "react";

function Header({ user, currentPage, onNavigate, onLogout, cartCount = 0 }) {
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  // Shop is active for both the category landing page and the product list.
  // Admin users get one extra navigation item for the order management page.
  const shopActive = currentPage === "shop" || currentPage === "products";
  const isAdmin = user.role === "admin";

  return (
    <header className="ps-header">
      <div className="ps-header-inner">
        <button
          type="button"
          className="ps-brand"
          onClick={() => onNavigate("home")}
        >
          <img src="/PlageSurf_LOGO.png" alt="Plage Surf" />
          <div>
            <p className="ps-brand-title">Plage Surf</p>
            <p className="ps-brand-sub">
              Welcome back {user?.username || "user"}!
            </p>
          </div>
        </button>

        <nav className="ps-nav">
          <button
            type="button"
            className={`ps-nav-link ${currentPage === "home" ? "active" : ""}`}
            onClick={() => onNavigate("home")}
          >
            Home
          </button>

          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setShopMenuOpen(true)}
            onMouseLeave={() => setShopMenuOpen(false)}
          >
            <button
              type="button"
              className={`ps-nav-link ${shopActive ? "active" : ""}`}
              onClick={() => setShopMenuOpen((prev) => !prev)}
              aria-expanded={shopMenuOpen}
              aria-haspopup="menu"
            >
              Shop {shopMenuOpen ? "▲" : "▼"}
            </button>

            {shopMenuOpen && (
              <div className="ps-nav-dropdown">
                {[
                  { name: "All Products", id: "" },
                  { name: "Surfboards", id: "surfboards" },
                  { name: "Wetsuits", id: "wetsuits" },
                  { name: "Clothing", id: "clothing" },
                  {
                    name: "Surfboard Accessories",
                    id: "surfboard accessories",
                  },
                ].map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      onNavigate("products", category.id);
                      setShopMenuOpen(false);
                    }}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={`ps-nav-link ${currentPage === "contact" ? "active" : ""}`}
            onClick={() => onNavigate("contact")}
          >
            Contact
          </button>

          {/* Only admins should see the order management link. */}
          {/* This keeps the customer navigation clean while exposing the dashboard. */}
          {isAdmin && (
            <>
              <button
                type="button"
                className={`ps-nav-link ${currentPage === "manage-orders" ? "active" : ""}`}
                onClick={() => onNavigate("manage-orders")}
              >
                Manage orders
              </button>
              <button
                type="button"
                className={`ps-nav-link ${currentPage === "manage-products" ? "active" : ""}`}
                onClick={() => onNavigate("manage-products")}
              >
                Manage products
              </button>
            </>
          )}
        </nav>

        <div className="ps-user-row">
          {/* Show the signed-in username so the header always reflects the session. */}
          {/* Cart is hidden for admins because the admin flow is dashboard-only. */}
          <span style={{ color: "#5f5550", fontSize: "13px", fontWeight: 700 }}>
            {user.username}
          </span>

          {user.role === "user" && (
            <button
              type="button"
              className="ps-cart-button"
              onClick={() => onNavigate("cart")}
              aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <img
                src="/CartLogo/cartlogo.png"
                alt="Cart"
                className="ps-cart-icon"
              />
              {cartCount > 0 && (
                <span className="ps-cart-count">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
              <span className="ps-cart-label">cart</span>
            </button>
          )}

          <button
            type="button"
            className="ps-btn ps-btn-secondary"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
