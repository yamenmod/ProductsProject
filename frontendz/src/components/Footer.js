import React from "react";

function Footer() {
  return (
    <footer
      style={{
        marginTop: "48px",
        background:
          "linear-gradient(135deg, #081525 0%, #0f2940 50%, #0b3554 100%)",
        color: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "42px 24px 22px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "28px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "800",
              letterSpacing: "0.6px",
              marginBottom: "12px",
            }}
          >
            Surf Shop
          </div>
          <p
            style={{
              margin: 0,
              color: "#cbd5e1",
              lineHeight: "1.8",
              fontSize: "14px",
            }}
          >
            A modern surfing storefront built for clear browsing, reliable
            shopping, and a more polished customer experience.
          </p>
        </div>

        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "800",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "14px",
              color: "#93c5fd",
            }}
          >
            Quick info
          </div>
          <div
            style={{
              display: "grid",
              gap: "10px",
              color: "#e2e8f0",
              fontSize: "14px",
            }}
          >
            <span>Premium boards and gear</span>
            <span>Professional support team</span>
            <span>Secure checkout flow</span>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "800",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "14px",
              color: "#93c5fd",
            }}
          >
            Contact
          </div>
          <div
            style={{
              display: "grid",
              gap: "10px",
              color: "#cbd5e1",
              fontSize: "14px",
              lineHeight: "1.7",
            }}
          >
            <span>Email: support@surfshop.com</span>
            <span>Phone: +1 (555) 123-4567</span>
            <span>Hours: Mon–Sat, 9:00 AM – 6:00 PM</span>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(148, 163, 184, 0.22)",
          padding: "16px 24px 20px",
          textAlign: "center",
          color: "#cbd5e1",
          fontSize: "13px",
        }}
      >
        © 2026 Surf Shop. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
