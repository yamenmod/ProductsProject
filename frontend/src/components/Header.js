import React, { useRef, useState } from "react";
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
  });
  const [tempBoardInputs, setTempBoardInputs] = useState({
    weight: "",
    height: "",
  });
  const [boardUsingSavedProfile, setBoardUsingSavedProfile] = useState(false);
  const [useCustomMeasurements, setUseCustomMeasurements] = useState(false);
  const [boardRecommendations, setBoardRecommendations] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const recommendationRequestIdRef = useRef(0);

  const isValidMeasurement = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0;
  };

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

  const handleGetRecommendations = async (overrideInputs) => {
    setRecommendationError("");
    setRecommendationLoading(true);

    const activeInputs =
      overrideInputs || (useCustomMeasurements ? tempBoardInputs : boardInputs);
    const resolvedInputs = {
      weight: activeInputs.weight,
      height: activeInputs.height,
    };

    console.log("CUSTOM MODE:", useCustomMeasurements);
    console.log("PROFILE WEIGHT:", user?.weight);
    console.log("BOARD INPUTS:", boardInputs);
    console.log("TEMP INPUTS:", tempBoardInputs);
    console.log("WEIGHT ACTUALLY SENT:", Number(resolvedInputs.weight));

    try {
      const hasWeight = isValidMeasurement(resolvedInputs.weight);
      const hasHeight = isValidMeasurement(resolvedInputs.height);

      if (!hasWeight || !hasHeight) {
        setRecommendationError("weight and height are required");
        setRecommendationLoading(false);
        return;
      }

      const requestId = ++recommendationRequestIdRef.current;

      const response = await axios.post("/api/products/recommend-boards", {
        weight: Number(resolvedInputs.weight),
      });

      if (requestId !== recommendationRequestIdRef.current) {
        return;
      }

      const recommendations =
        response.data?.recommendations ||
        response.data?.boards ||
        response.data?.products ||
        [];

      setBoardRecommendations({
        ...response.data,
        recommendations,
      });
    } catch (error) {
      console.error("Recommendation error:", error);
      setRecommendationError(
        error.response?.data?.message ||
          error.message ||
          "Failed to get recommendations",
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const resetBoardChooser = () => {
    // Close the chooser and clear the previous recommendation results.
    setBoardInputs({ weight: "", height: "" });
    setTempBoardInputs({ weight: "", height: "" });
    setBoardRecommendations(null);
    setRecommendationError("");
    setBoardUsingSavedProfile(false);
    setUseCustomMeasurements(false);
    recommendationRequestIdRef.current += 1;
    setChooseBoardOpen(false);
  };

  const startCustomMeasurements = () => {
    setTempBoardInputs((prev) => ({
      weight: prev.weight || parseMeasurementValue(user?.weight),
      height: prev.height || parseMeasurementValue(user?.height),
    }));
    setUseCustomMeasurements(true);
    setBoardRecommendations(null);
    setRecommendationError("");
    recommendationRequestIdRef.current += 1;
  };

  const handleTryDifferentSettings = () => {
    console.log("TEMP BEFORE REOPEN:", tempBoardInputs);
    setUseCustomMeasurements(true);
    setBoardRecommendations(null);
    setRecommendationError("");
    recommendationRequestIdRef.current += 1;
  };

  const handleUseSavedMeasurements = () => {
    const savedWeight = parseMeasurementValue(user?.weight);
    const savedHeight = parseMeasurementValue(user?.height);

    setBoardInputs({
      weight: savedWeight,
      height: savedHeight,
    });

    setTempBoardInputs({
      weight: savedWeight,
      height: savedHeight,
    });
    setUseCustomMeasurements(false);
    setBoardUsingSavedProfile(true);
    setBoardRecommendations(null);
    setRecommendationError("");
    recommendationRequestIdRef.current += 1;

    void handleGetRecommendations({
      weight: savedWeight,
      height: savedHeight,
    });
  };

  const handleOpenBoardChooser = () => {
    const initialInputs = getInitialBoardInputs();
    const hasWeight = isValidMeasurement(initialInputs.weight);
    const hasHeight = isValidMeasurement(initialInputs.height);
    const hasSavedMeasurements = hasWeight && hasHeight;

    setBoardInputs(initialInputs);
    setBoardRecommendations(null);
    setRecommendationError("");

    setBoardUsingSavedProfile(hasSavedMeasurements);
    setUseCustomMeasurements(false);
    recommendationRequestIdRef.current += 1;
    setChooseBoardOpen(true);

    if (hasSavedMeasurements) {
      void handleGetRecommendations(initialInputs);
    }
  };

  // Shop is active for both the category landing page and the product list.
  // Admin users get one extra navigation item for the order management page.
  const shopActive =
    currentPage === "shop" ||
    currentPage === "products" ||
    currentPage === "size-charts";
  const isAdmin = user?.role === "admin";
  const isCustomer = user?.role === "user";

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

          {isCustomer && (
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
                {cartCount === 0 ? "0" : cartCount > 99 ? "99+" : cartCount}
              </span>
              <span className="ps-cart-label">Cart</span>
            </button>
          )}

          {user && isCustomer && (
            <button
              type="button"
              className="ps-nav-link"
              onClick={() => onNavigate("my-orders")}
              style={{ marginLeft: 8 }}
            >
              My Orders
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
              boardUsingSavedProfile && !useCustomMeasurements ? (
                <>
                  <h2 style={{ marginTop: 0, marginBottom: "12px" }}>
                    Choose My Board
                  </h2>
                  <p style={{ margin: 0, color: "#65574d", lineHeight: 1.6 }}>
                    Using your saved measurements:
                    <br />
                    Weight: {Number(boardInputs.weight)} kg
                    <br />
                    Height: {Number(boardInputs.height)} cm
                  </p>

                  {recommendationLoading && (
                    <p style={{ marginTop: "14px", color: "#65574d" }}>
                      Finding your recommendations...
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      type="button"
                      className="ps-btn ps-btn-secondary"
                      onClick={startCustomMeasurements}
                    >
                      Try Different Measurements
                    </button>
                    <button
                      type="button"
                      className="ps-btn ps-btn-primary"
                      onClick={() => handleGetRecommendations()}
                      disabled={recommendationLoading}
                    >
                      {recommendationLoading
                        ? "Loading..."
                        : "Get Recommendations"}
                    </button>
                    <button
                      type="button"
                      className="ps-btn ps-btn-secondary"
                      onClick={resetBoardChooser}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ marginTop: 0, marginBottom: "20px" }}>
                    Choose My Board
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
                      Using your saved measurements:
                      <br />
                      Weight: {Number(boardInputs.weight)} kg
                      <br />
                      Height: {Number(boardInputs.height)} cm
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
                      Enter your weight and height to find boards that match
                      your needs.
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
                    {/* Weight and height are collected here, but only weight is sent to the recommendation endpoint. */}
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      value={
                        useCustomMeasurements
                          ? tempBoardInputs.weight
                          : boardInputs.weight
                      }
                      onChange={(e) =>
                        useCustomMeasurements
                          ? (console.log(
                              "CUSTOM INPUT CHANGED:",
                              e.target.value,
                            ),
                            setTempBoardInputs({
                              ...tempBoardInputs,
                              weight: e.target.value,
                            }))
                          : setBoardInputs({
                              ...boardInputs,
                              weight: e.target.value,
                            })
                      }
                      disabled={recommendationLoading}
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
                      value={
                        useCustomMeasurements
                          ? tempBoardInputs.height
                          : boardInputs.height
                      }
                      onChange={(e) =>
                        useCustomMeasurements
                          ? (console.log(
                              "CUSTOM INPUT CHANGED:",
                              e.target.value,
                            ),
                            setTempBoardInputs({
                              ...tempBoardInputs,
                              height: e.target.value,
                            }))
                          : setBoardInputs({
                              ...boardInputs,
                              height: e.target.value,
                            })
                      }
                      disabled={recommendationLoading}
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
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="ps-btn ps-btn-secondary"
                      onClick={resetBoardChooser}
                    >
                      Cancel
                    </button>

                    {boardUsingSavedProfile && (
                      <button
                        type="button"
                        className="ps-btn ps-btn-secondary"
                        onClick={handleUseSavedMeasurements}
                      >
                        Use Saved Measurements
                      </button>
                    )}

                    <button
                      type="button"
                      className="ps-btn ps-btn-primary"
                      onClick={() => handleGetRecommendations()}
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
                                #{index + 1} {board.name}
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
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "6px 10px",
                                borderRadius: "999px",
                                background:
                                  board.matchLabel === "PERFECT"
                                    ? "rgba(36, 88, 96, 0.14)"
                                    : board.matchLabel === "GOOD"
                                      ? "rgba(199, 122, 74, 0.16)"
                                      : "rgba(217, 83, 79, 0.14)",
                                color:
                                  board.matchLabel === "PERFECT"
                                    ? "#245860"
                                    : board.matchLabel === "GOOD"
                                      ? "#a65b2d"
                                      : "#b03b37",
                                fontSize: "12px",
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                              }}
                            >
                              {board.matchLabel}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: "11px",
                              color: "#666",
                            }}
                          >
                            Volume: {board.volume}L
                          </p>
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
                    No suitable surfboards found. Try a different weight or
                    check board volumes.
                  </p>
                )}

                <button
                  type="button"
                  className="ps-btn ps-btn-primary"
                  onClick={handleTryDifferentSettings}
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
