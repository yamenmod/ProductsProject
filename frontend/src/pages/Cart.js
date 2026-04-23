import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Cart({
  user,
  preferredGender,
  currentPage,
  onNavigate,
  onPreferredGenderChange,
  onLogout,
  cartItems = [],
  onRemoveFromCart,
  cartCount = 0,
}) {
  const totalPrice = cartItems.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0,
  );

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
        <div className="ps-shell" style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div>
              <p className="ps-pill" style={{ marginBottom: "12px" }}>Your cart</p>
              <h1 className="ps-title">Shopping Cart</h1>
            </div>
            <button
              type="button"
              className="ps-btn ps-btn-primary"
              onClick={() => onNavigate("products", "")}
            >
              Continue shopping
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="ps-surface" style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "18px", color: "#65574d" }}>
                Your cart is empty. Add products from the home page or the shop.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "24px" }}>
              {cartItems.map((item) => (
                <div key={item.id} className="ps-surface" style={{ padding: "24px", display: "grid", gridTemplateColumns: "120px minmax(0, 1fr) 140px", gap: "20px", alignItems: "center" }}>
                  <img
                    src={item.image || item.image_urls || item.imageUrl || item.image_url || "https://via.placeholder.com/120x120?text=No+Image"}
                    alt={item.name || "Cart product"}
                    style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "18px", background: "#efefef" }}
                  />
                  <div>
                    <h2 style={{ margin: "0 0 8px", fontSize: "18px" }}>{item.name || "Product"}</h2>
                    <p style={{ margin: "0 0 8px", color: "#65574d", fontSize: "14px" }}>{item.category || ""}</p>
                    <p style={{ margin: 0, color: "#1f1813", fontWeight: 700 }}>${(Number(item.price) || 0).toFixed(2)} × {item.quantity || 1}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      className="ps-btn ps-btn-secondary"
                      style={{ padding: "9px 16px" }}
                      onClick={() => onRemoveFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="ps-surface" style={{ padding: "28px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
                <div>
                  <p style={{ margin: "0 0 6px", color: "#65574d" }}>Items</p>
                  <h2 style={{ margin: 0 }}>
                    {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                  </h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 6px", color: "#65574d" }}>Total</p>
                  <h2 style={{ margin: 0 }}>${totalPrice.toFixed(2)}</h2>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Cart;
