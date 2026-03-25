import React from "react";

function Footer() {
  return (
    <footer
      style={{
        padding: "20px",
        background: "linear-gradient(135deg, #0a3d62 0%, #0084b4 100%)",
        color: "white",
        marginTop: "40px",
        textAlign: "center",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        boxShadow: "0 -4px 12px rgba(10, 61, 98, 0.1)",
      }}
    >
      <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
        🛍️ Product Management App
      </p>
    </footer>
  );
}

export default Footer;
