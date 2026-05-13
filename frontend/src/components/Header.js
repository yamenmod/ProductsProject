import React, { useState } from "react";
import axios from "axios";

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
  const [chooseBoardOpen, setChooseBoardOpen] = useState(false);
  const [boardInputs, setBoardInputs] = useState({
    weight: "",
    height: "",
    skillLevel: "beginner",
  });
  const [boardUsingSavedProfile, setBoardUsingSavedProfile] = useState(false);
  const [boardRecommendations, setBoardRecommendations] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");

  const parseMeasurementValue = (value) => {
    if (value === undefined || value === null || value === "") {
      return "";
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? String(numericValue) : "";
  };

  const getInitialBoardInputs = () => ({
    weight: parseMeasurementValue(user?.weight),
    height: parseMeasurementValue(user?.height),
    skillLevel: "beginner",
  });

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

  const handleGetRecommendations = async (nextInputs = boardInputs) => {
    setRecommendationError("");
    setRecommendationLoading(true);

    const resolvedInputs = {
      weight: (nextInputs.weight || "").toString().trim(),
      height: (nextInputs.height || "").toString().trim(),
      skillLevel: nextInputs.skillLevel || "beginner",
    };

    try {
      // The board chooser uses the shopper's body data to ask the backend for matches.
      if (!resolvedInputs.weight || !resolvedInputs.height) {
        setRecommendationError("Please enter weight and height");
        setRecommendationLoading(false);
        return;
      }

      const response = await axios.post("/api/products/recommend-boards", {
        weight: Number(resolvedInputs.weight),
        height: Number(resolvedInputs.height),
        skillLevel: resolvedInputs.skillLevel,
      });

      setBoardRecommendations(response.data);
    } catch (error) {
      setRecommendationError(
        error.response?.data?.message || "Failed to get recommendations",
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const resetBoardChooser = () => {
    // Close the chooser and clear the previous recommendation results.
    setBoardInputs({ weight: "", height: "", skillLevel: "beginner" });
    setBoardRecommendations(null);
    setRecommendationError("");
    setBoardUsingSavedProfile(false);
    setChooseBoardOpen(false);
  };

  const handleOpenBoardChooser = () => {
    const initialInputs = getInitialBoardInputs();

    setBoardInputs(initialInputs);
    setBoardRecommendations(null);
    setRecommendationError("");

    // Check if we have any measurements to work with
    const hasAnyMeasurements =
      (initialInputs.weight && initialInputs.weight !== "") ||
      (initialInputs.height && initialInputs.height !== "");

    setBoardUsingSavedProfile(hasAnyMeasurements);
    setChooseBoardOpen(true);

    // If we have measurements, auto-fetch recommendations
    if (hasAnyMeasurements && initialInputs.weight && initialInputs.height) {
      void handleGetRecommendations(initialInputs);
    }
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

              <button
                type="button"
                className="ps-nav-link"
                onClick={handleOpenBoardChooser}
              >
                Choose My Board
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
              <button
                type="button"
                className={`ps-nav-link ${currentPage === "profile" ? "active" : ""}`}
                onClick={() => onNavigate("profile")}
              >
                Profile
              </button>
            </>
          )}
        </nav>

        <div className="ps-user-row">
          {/* Show the signed-in username so the header always reflects the session. */}
          {/* Cart is hidden for admins because the admin flow is dashboard-only. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {user && (
              <button
                type="button"
                className="ps-profile-button"
                onClick={() => onNavigate("profile")}
                title="View and edit your profile"
                aria-label="Profile"
              >
                <img
                  src="/Logo/ProfileLogo/ProfileLogoWithoutBackGround.png"
                  alt="Profile"
                  className="ps-profile-icon"
                />
                <span className="ps-cart-label">Profile</span>
              </button>
            )}
          </div>

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
              <span className="ps-cart-count">
                {cartCount === 0 ? "empty" : cartCount > 99 ? "99+" : cartCount}
              </span>
              <span className="ps-cart-label">Cart</span>
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
            <h2 className="ps-cartConfirmTitle">
              Are you sure you want to logout?
            </h2>
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
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {chooseBoardOpen && (
        // This modal is the "Choose My Board" helper that suggests surfboards.
        <div className="ps-cartConfirmBackdrop" onClick={resetBoardChooser}>
          <div
            className="ps-cartConfirmCard"
            role="dialog"
            aria-label="Choose my board"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            {!boardRecommendations ? (
              recommendationLoading && boardUsingSavedProfile ? (
                <>
                  <h2 style={{ marginTop: 0, marginBottom: "12px" }}>
                    Finding your recommendations
                  </h2>
                  <p style={{ margin: 0, color: "#65574d", lineHeight: 1.6 }}>
                    We found saved measurements on your profile, so the board
                    chooser is using them automatically.
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ marginTop: 0, marginBottom: "20px" }}>
                    Find Your Perfect Board
                  </h2>

                  {boardUsingSavedProfile && (
                    <p
                      style={{
                        marginTop: 0,
                        marginBottom: "16px",
                        color: "#65574d",
                        lineHeight: 1.5,
                        fontWeight: 500,
                      }}
                    >
                      Using your saved measurements.
                    </p>
                  )}

                  {!boardUsingSavedProfile && (
                    <p
                      style={{
                        marginTop: 0,
                        marginBottom: "16px",
                        color: "#65574d",
                        lineHeight: 1.5,
                      }}
                    >
                      Enter your measurements to find boards that match your
                      needs.
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginBottom: "20px",
                    }}
                  >
                    {/* Weight, height, and skill level are sent to the recommendation endpoint. */}
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      value={boardInputs.weight}
                      onChange={(e) =>
                        setBoardInputs({
                          ...boardInputs,
                          weight: e.target.value,
                        })
                      }
                      disabled={boardUsingSavedProfile && recommendationLoading}
                      min="30"
                      max="150"
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #d9c3ad",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        opacity:
                          boardUsingSavedProfile && recommendationLoading
                            ? 0.6
                            : 1,
                        cursor:
                          boardUsingSavedProfile && recommendationLoading
                            ? "not-allowed"
                            : "auto",
                      }}
                    />

                    <input
                      type="number"
                      placeholder="Height (cm)"
                      value={boardInputs.height}
                      onChange={(e) =>
                        setBoardInputs({
                          ...boardInputs,
                          height: e.target.value,
                        })
                      }
                      disabled={boardUsingSavedProfile && recommendationLoading}
                      min="120"
                      max="220"
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #d9c3ad",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        opacity:
                          boardUsingSavedProfile && recommendationLoading
                            ? 0.6
                            : 1,
                        cursor:
                          boardUsingSavedProfile && recommendationLoading
                            ? "not-allowed"
                            : "auto",
                      }}
                    />

                    <select
                      value={boardInputs.skillLevel}
                      onChange={(e) =>
                        setBoardInputs({
                          ...boardInputs,
                          skillLevel: e.target.value,
                        })
                      }
                      disabled={boardUsingSavedProfile && recommendationLoading}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid #d9c3ad",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        cursor:
                          boardUsingSavedProfile && recommendationLoading
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          boardUsingSavedProfile && recommendationLoading
                            ? 0.6
                            : 1,
                      }}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  {recommendationError && (
                    <p
                      style={{
                        color: "#d9534f",
                        marginBottom: "16px",
                        fontSize: "14px",
                      }}
                    >
                      {recommendationError}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      className="ps-btn ps-btn-secondary"
                      onClick={resetBoardChooser}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ps-btn ps-btn-primary"
                      onClick={handleGetRecommendations}
                      disabled={recommendationLoading}
                    >
                      {recommendationLoading
                        ? "Loading..."
                        : "Get Recommendations"}
                    </button>
                  </div>
                </>
              )
            ) : (
              <>
                <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
                  Your Top Recommendations
                </h2>

                {boardRecommendations.recommendations &&
                boardRecommendations.recommendations.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    {boardRecommendations.recommendations.map(
                      (board, index) => (
                        <div
                          key={board.id}
                          style={{
                            padding: "12px",
                            border: "1px solid #d9c3ad",
                            borderRadius: "8px",
                            background: "#fffdf8",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "start",
                              marginBottom: "8px",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  margin: "0 0 4px 0",
                                  fontWeight: "600",
                                }}
                              >
                                #{index + 1} - {board.name}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "12px",
                                  color: "#666",
                                }}
                              >
                                ${board.price}
                              </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  color: "#245860",
                                }}
                              >
                                {board.recommendationScore}% Match
                              </p>
                              <p
                                style={{
                                  margin: "4px 0 0 0",
                                  fontSize: "11px",
                                  color: "#666",
                                }}
                              >
                                Volume: {board.volume}L | Length:{" "}
                                {board.boardLength}ft
                              </p>
                            </div>
                          </div>
                          <p
                            style={{
                              margin: "8px 0 0 0",
                              fontSize: "13px",
                              lineHeight: "1.4",
                            }}
                          >
                            {board.description &&
                              board.description.substring(0, 100)}
                            ...
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p style={{ marginBottom: "20px", color: "#666" }}>
                    No suitable surfboards found. Try adjusting your
                    preferences.
                  </p>
                )}

                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={() => setBoardRecommendations(null)}
                  style={{ width: "100%" }}
                >
                  Try Different Settings
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
