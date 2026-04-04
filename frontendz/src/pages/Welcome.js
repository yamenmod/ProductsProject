import React from "react";

function Welcome({ onGetStarted }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative wave elements - Realistic and Animated */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "320px",
          background:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 1200 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='oceanGrad' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%230ea5e9;stop-opacity:0.25'/%3E%3Cstop offset='100%25' style='stop-color:%231e40af;stop-opacity:0.2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,120 Q150,60 300,120 T600,120 T900,120 T1200,120 L1200,300 L0,300 Z' fill='url(%23oceanGrad)' opacity='0.8'/%3E%3Cpath d='M0,100 Q200,40 400,100 T800,100 T1200,100 L1200,300 L0,300 Z' fill='none' stroke='%230ea5e9' stroke-width='3' opacity='0.7'/%3E%3Cpath d='M0,140 Q180,80 360,140 T720,140 T1080,140 T1200,150 L1200,300 L0,300 Z' fill='none' stroke='%23e0f2fe' stroke-width='2' opacity='0.8'/%3E%3Cpath d='M0,130 Q220,70 440,130 T880,130 T1200,130 L1200,300 L0,300 Z' fill='%23f0f9ff' opacity='0.15'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat-x",
          backgroundSize: "1200px 300px",
          backgroundPosition: "0 0",
          opacity: 1,
          animation: "wave 12s linear infinite",
        }}
      />
      {/* Secondary wave layer for depth */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          height: "240px",
          background:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 1200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,80 Q175,30 350,80 T700,80 T1050,80 T1200,85 L1200,200 L0,200 Z' fill='none' stroke='%230284c7' stroke-width='2.5' opacity='0.6'/%3E%3Cpath d='M0,90 Q200,50 400,90 T800,90 T1200,90 L1200,200 L0,200 Z' fill='%23dbeafe' opacity='0.2'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat-x",
          backgroundSize: "1200px 200px",
          backgroundPosition: "0 0",
          opacity: 1,
          animation: "wave 15s linear infinite reverse",
        }}
      />
      <style>{`
        @keyframes wave {
          0% { background-position: 0 0; }
          100% { background-position: 1200px 0; }
        }
      `}</style>

      <div
        style={{
          textAlign: "center",
          maxWidth: "700px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: "60px",
              marginBottom: "16px",
            }}
          >
            🏄
          </div>
          <h1
            style={{
              margin: "0",
              fontSize: "42px",
              fontWeight: "800",
              color: "#1e40af",
              letterSpacing: "-1.5px",
              textShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            }}
          >
            Surf Shop
          </h1>
          <p
            style={{
              margin: "12px 0 0 0",
              fontSize: "18px",
              color: "#0ea5e9",
              fontWeight: "500",
              letterSpacing: "0.3px",
            }}
          >
            Your guide to the perfect wave
          </p>
        </div>

        {/* Hero Section */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "60px 40px",
            boxShadow:
              "0 4px 24px rgba(14, 165, 233, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)",
            marginBottom: "40px",
            borderTop: "3px solid #0ea5e9",
          }}
        >
          <h2
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e40af",
              margin: "0 0 16px 0",
              letterSpacing: "-0.5px",
            }}
          >
            Welcome to the Community
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#475569",
              margin: "0 0 32px 0",
              lineHeight: "1.7",
              fontWeight: "400",
            }}
          >
            Track your favorite spots, stay updated with forecasts, and connect
            with fellow wave enthusiasts worldwide.
          </p>

          {/* Feature List */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "32px",
              textAlign: "left",
            }}
          >
            {[
              {
                icon: "📍",
                title: "Spot Tracking",
                desc: "Save your favorite breaks",
              },
              {
                icon: "🌊",
                title: "Wave Forecasts",
                desc: "Real-time conditions",
              },
              { icon: "👥", title: "Community", desc: "Connect with surfers" },
              { icon: "⭐", title: "Reviews", desc: "Tips and insights" },
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  padding: "16px",
                  background:
                    "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                  borderRadius: "10px",
                  border: "1px solid #bee3f8",
                  transition: "all 0.3s ease",
                  cursor: "default",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 25px rgba(14, 165, 233, 0.15)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>
                  {feature.icon}
                </div>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#1e40af",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    margin: "0",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onGetStarted}
          style={{
            padding: "14px 48px",
            fontSize: "16px",
            fontWeight: "700",
            background: "#0ea5e9",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            boxShadow: "0 6px 16px rgba(14, 165, 233, 0.2)",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "#0284c7";
            e.target.style.transform = "translateY(-3px)";
            e.target.style.boxShadow = "0 10px 24px rgba(14, 165, 233, 0.3)";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "#0ea5e9";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 6px 16px rgba(14, 165, 233, 0.2)";
          }}
        >
          Get Started →
        </button>

        {/* Footer Text */}
        <p
          style={{
            marginTop: "32px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          Already have an account?{" "}
          <span
            onClick={onGetStarted}
            style={{
              color: "#1e40af",
              cursor: "pointer",
              fontWeight: "700",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
}

export default Welcome;
