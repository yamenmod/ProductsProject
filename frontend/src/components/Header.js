import React, { useState } from "react";

function Header({
  user,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
}) {
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [logoutPromptOpen, setLogoutPromptOpen] = useState(false);

  const handleLogoutClick = () => {
    setLogoutPromptOpen(true);
  };

  const handleConfirmLogout = () => {
    setLogoutPromptOpen(false);
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  const handleCancelLogout = () => {
    setLogoutPromptOpen(false);
  };

  // Shop is active for both the category landing page and the product list.
  // Admin users get one extra navigation item for the order management page.
  const shopActive =
    currentPage === "shop" ||
    currentPage === "products" ||
    currentPage === "size-charts";
  const isAdmin = user.role === "admin";

  return (
    <header className="ps-header">
      <div className="ps-header-inner">
        <div className="ps-brand-cluster">
          <button
            type="button"
            className="ps-brand"
            onClick={() => onNavigate(isAdmin ? "admin-dashboard" : "home")}
          >
            <img src="/PlageSurf_LOGO.png" alt="Plage Surf" />
            <div>
              <p className="ps-brand-title">Plage Surf</p>
              <p className="ps-brand-sub">
                Welcome back {user?.username || "user"}!
              </p>
            </div>
          </button>

          {!isAdmin && (
            <div className="ps-header-genderToggle" aria-label="Shop by gender">
              {[
                { label: "Women's", value: "female" },
                { label: "Men's", value: "male" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    preferredGender === option.value
                      ? "ps-header-genderButton is-active"
                      : "ps-header-genderButton"
                  }
                  onClick={() => onPreferredGenderChange?.(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="ps-nav">
          {!isAdmin && (
            <>
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
                className={`ps-nav-link ${currentPage === "size-charts" ? "active" : ""}`}
                onClick={() => onNavigate("size-charts")}
              >
                Size Chart
              </button>

              <button
                type="button"
                className={`ps-nav-link ${currentPage === "contact" ? "active" : ""}`}
                onClick={() => onNavigate("contact")}
              >
                Contact
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                className={`ps-nav-link ${currentPage === "admin-dashboard" ? "active" : ""}`}
                onClick={() => onNavigate("admin-dashboard")}
              >
                Dashboard
              </button>
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
              <button
                type="button"
                className={`ps-nav-link ${currentPage === "manage-customers" ? "active" : ""}`}
                onClick={() => onNavigate("manage-customers")}
              >
                Manage customers
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
            onClick={handleLogoutClick}
          >
            Logout
          </button>
        </div>
      </div>

      {logoutPromptOpen && (
        <div className="ps-cartConfirmBackdrop" onClick={handleCancelLogout}>
          <div
            className="ps-cartConfirmCard"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm logout"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="ps-pill" style={{ margin: 0, width: "fit-content" }}>
              Confirm sign out
            </p>
            <h2 className="ps-cartConfirmTitle">Sign out of your account?</h2>
            <p className="ps-cartConfirmText">
              You are about to end your session. If you finish any active tasks,
              you can sign back in at any time.
            </p>
            <div className="ps-cartConfirmActions">
              <button
                type="button"
                className="ps-btn ps-cartConfirmCancel"
                onClick={handleCancelLogout}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ps-btn ps-cartConfirmDelete"
                onClick={handleConfirmLogout}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
