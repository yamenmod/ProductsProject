import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Contact({ user, currentPage, onNavigate, onLogout, cartCount = 0 }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
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

      {/* Main Content */}
      <div style={{ flex: 1, padding: "80px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Page Header */}
          <div style={{ textAlign: "center", marginBottom: "80px" }}>
            <p
              style={{
                color: "#0ea5e9",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "2px",
                textTransform: "uppercase",
                margin: "0 0 16px 0",
              }}
            >
              Get in Touch
            </p>
            <h1
              style={{
                fontSize: "48px",
                fontWeight: "900",
                color: "#0f172a",
                margin: "0 0 24px 0",
                letterSpacing: "-1px",
              }}
            >
              Contact Us
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: "16px",
                margin: "0",
                maxWidth: "600px",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: "1.6",
              }}
            >
              We'd love to hear from you. Whether you have a question about our
              products or anything else, our team is ready to answer all your
              questions.
            </p>
          </div>

          {/* Contact Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "32px",
              marginBottom: "80px",
            }}
          >
            {[
              {
                title: "Address",
                value: "123 Surfside Avenue, Coastal City, CC 12345",
                icon: "📍",
              },
              {
                title: "Phone",
                value: "+1 (555) 123-4567",
                icon: "📞",
              },
              {
                title: "Email",
                value: "info@surfshop.com",
                icon: "✉️",
              },
              {
                title: "Hours",
                value: "Mon - Fri: 9AM - 6PM | Sat - Sun: 10AM - 4PM",
                icon: "🕐",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "40px 32px",
                  background:
                    "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 40px rgba(0, 0, 0, 0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    fontSize: "40px",
                    marginBottom: "16px",
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#0f172a",
                    margin: "0 0 12px 0",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "14px",
                    margin: "0",
                    lineHeight: "1.6",
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div
            style={{
              maxWidth: "700px",
              margin: "0 auto",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              borderRadius: "16px",
              padding: "60px 40px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: "#0f172a",
                margin: "0 0 32px 0",
                textAlign: "center",
              }}
            >
              Send us a Message
            </h2>

            <form
              style={{
                display: "grid",
                gap: "20px",
              }}
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you for your message! We'll be in touch soon.");
                e.target.reset();
              }}
            >
              <input
                type="text"
                placeholder="Your Name"
                required
                style={{
                  padding: "14px 16px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0ea5e9";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                }}
              />

              <input
                type="email"
                placeholder="Your Email"
                required
                style={{
                  padding: "14px 16px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0ea5e9";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                }}
              />

              <input
                type="text"
                placeholder="Subject"
                required
                style={{
                  padding: "14px 16px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0ea5e9";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                }}
              />

              <textarea
                placeholder="Your Message"
                rows="6"
                required
                style={{
                  padding: "14px 16px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "none",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0ea5e9";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                }}
              />

              <button
                type="submit"
                style={{
                  padding: "14px 28px",
                  background:
                    "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 10px 30px rgba(14, 165, 233, 0.2)",
                  letterSpacing: "0.5px",
                }}
                onMouseOver={(e) => {
                  e.target.style.boxShadow =
                    "0 15px 40px rgba(14, 165, 233, 0.3)";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.boxShadow =
                    "0 10px 30px rgba(14, 165, 233, 0.2)";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Contact;
