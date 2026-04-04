import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Home({ user, currentPage, onNavigate, onLogout, cartCount = 0 }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #f8fbff 0%, #eef6fb 48%, #ffffff 100%)",
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

      <main style={{ flex: 1 }}>
        <section style={{ padding: "92px 40px 84px" }}>
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "40px",
              alignItems: "center",
            }}
          >
            <div style={{ maxWidth: "820px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  background: "rgba(14, 165, 233, 0.08)",
                  color: "#0369a1",
                  fontSize: "12px",
                  fontWeight: "800",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  marginBottom: "18px",
                }}
              >
                Premium surf retail
              </div>

              <h1
                style={{
                  fontSize: "clamp(34px, 4vw, 44px)",
                  fontWeight: "900",
                  color: "#0f172a",
                  margin: "0 0 14px 0",
                  letterSpacing: "-1px",
                  lineHeight: "1.18",
                }}
              >
                Surf Shop — premium gear, cleaner shopping.
              </h1>

              <p
                style={{
                  fontSize: "16px",
                  color: "#475569",
                  margin: "0 0 30px 0",
                  maxWidth: "720px",
                  lineHeight: "1.75",
                  fontWeight: "400",
                }}
              >
                Discover curated boards, wetsuits, and coastal essentials in a
                calm, modern storefront designed to feel clear, fast, and
                professional from the first click.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  justifyContent: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => onNavigate("shop")}
                  style={{
                    padding: "14px 26px",
                    background:
                      "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    transition: "all 0.25s ease",
                    boxShadow: "0 10px 24px rgba(14, 165, 233, 0.18)",
                    letterSpacing: "0.4px",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 16px 32px rgba(14, 165, 233, 0.24)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 10px 24px rgba(14, 165, 233, 0.18)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Explore Shop
                </button>

                <button
                  onClick={() => onNavigate("contact")}
                  style={{
                    padding: "14px 26px",
                    background: "rgba(255,255,255,0.82)",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    transition: "all 0.25s ease",
                    letterSpacing: "0.4px",
                    backdropFilter: "blur(10px)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#94a3b8";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.82)";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Contact Team
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                  marginTop: "34px",
                }}
              >
                {[
                  { value: "Support", label: "Business-hours assistance" },
                  { value: "Secure", label: "Checkout" },
                  { value: "Simple", label: "Category navigation" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "rgba(255,255,255,0.78)",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "16px",
                      padding: "16px 18px",
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    <div
                      style={{
                        color: "#0f172a",
                        fontSize: "19px",
                        fontWeight: "800",
                        marginBottom: "5px",
                      }}
                    >
                      {item.value}
                    </div>
                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: "relative", minHeight: "460px" }}>
              <div
                style={{
                  position: "absolute",
                  inset: "24px 0 auto auto",
                  width: "82%",
                  height: "82%",
                  borderRadius: "28px",
                  background:
                    "linear-gradient(160deg, rgba(14,165,233,0.18), rgba(255,255,255,0.92))",
                }}
              />

              <div
                style={{
                  position: "relative",
                  marginTop: "42px",
                  marginLeft: "auto",
                  width: "min(100%, 420px)",
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  borderRadius: "28px",
                  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
                  overflow: "hidden",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  style={{
                    padding: "24px 24px 18px",
                    background:
                      "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                    color: "white",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "1.6px",
                      opacity: 0.9,
                      marginBottom: "10px",
                    }}
                  >
                    Featured collection
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800" }}>
                    Surf Shop
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      opacity: 0.92,
                      marginTop: "8px",
                    }}
                  >
                    Clean layout, premium products, simple checkout.
                  </div>
                </div>

                <div style={{ padding: "22px 24px 24px" }}>
                  {[
                    [
                      "Boards",
                      "High-performance and beginner-friendly options",
                    ],
                    ["Wetsuits", "Comfort, warmth, and flexibility"],
                    ["Accessories", "Everything needed for the beach"],
                  ].map(([title, text]) => (
                    <div
                      key={title}
                      style={{
                        display: "flex",
                        gap: "14px",
                        alignItems: "flex-start",
                        padding: "14px 0",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "999px",
                          background: "#0ea5e9",
                          marginTop: "6px",
                          flex: "0 0 auto",
                        }}
                      />
                      <div>
                        <div
                          style={{
                            color: "#0f172a",
                            fontWeight: "700",
                            fontSize: "15px",
                            marginBottom: "4px",
                          }}
                        >
                          {title}
                        </div>
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "13px",
                            lineHeight: "1.6",
                          }}
                        >
                          {text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
