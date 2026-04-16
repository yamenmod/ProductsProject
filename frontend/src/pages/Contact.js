import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Contact({
  user,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
}) {
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
        <div className="ps-shell">
          <div style={{ textAlign: "center", marginBottom: "54px" }}>
            <p className="ps-pill" style={{ marginBottom: "12px" }}>
              Get in touch
            </p>
            <h1 className="ps-title" style={{ marginBottom: "10px" }}>
              Contact us
            </h1>
            <p
              className="ps-lead"
              style={{ maxWidth: "640px", margin: "0 auto" }}
            >
              Reach the Plage Surf team for orders, products, or sizing help.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              marginBottom: "40px",
            }}
          >
            {[
              {
                title: "Address",
                value: "חוף הסטודנטים",
                icon: "Location",
              },
              {
                title: "Phone",
                value: "052-6387156",
                icon: "Phone",
              },
              {
                title: "Email",
                value: "yamenwaseem@gmail.com",
                icon: "Email",
              },
              {
                title: "Hours",
                value: "Sunday 8 AM - 6 PM | Monday closed",
                icon: "Hours",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="ps-surface"
                style={{
                  padding: "26px 22px",
                  borderRadius: "14px",
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
                    fontSize: "12px",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "1.6px",
                    color: "#245860",
                    fontWeight: "800",
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: "32px",
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    color: "#1f1813",
                    margin: "0 0 12px 0",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    color: "#65574d",
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

          <div
            style={{
              maxWidth: "760px",
              margin: "0 auto",
              borderRadius: "18px",
              padding: "36px 30px",
              background: "rgba(255, 250, 242, 0.84)",
              border: "1px solid rgba(31, 24, 19, 0.08)",
              boxShadow: "0 18px 42px rgba(67, 48, 33, 0.12)",
              backdropFilter: "blur(5px)",
            }}
          >
            <h2
              style={{
                fontSize: "54px",
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                color: "#1f1813",
                margin: "0 0 22px 0",
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
                  padding: "12px 14px",
                  background: "#fffdf8",
                  border: "1px solid #d9c3ad",
                  borderRadius: "10px",
                  color: "#1f1813",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#245860";
                  e.target.style.boxShadow = "0 0 0 3px rgba(36, 88, 96, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d9c3ad";
                  e.target.style.boxShadow = "none";
                }}
              />

              <input
                type="email"
                placeholder="Your Email"
                required
                style={{
                  padding: "12px 14px",
                  background: "#fffdf8",
                  border: "1px solid #d9c3ad",
                  borderRadius: "10px",
                  color: "#1f1813",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#245860";
                  e.target.style.boxShadow = "0 0 0 3px rgba(36, 88, 96, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d9c3ad";
                  e.target.style.boxShadow = "none";
                }}
              />

              <input
                type="text"
                placeholder="Subject"
                required
                style={{
                  padding: "12px 14px",
                  background: "#fffdf8",
                  border: "1px solid #d9c3ad",
                  borderRadius: "10px",
                  color: "#1f1813",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#245860";
                  e.target.style.boxShadow = "0 0 0 3px rgba(36, 88, 96, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d9c3ad";
                  e.target.style.boxShadow = "none";
                }}
              />

              <textarea
                placeholder="Your Message"
                rows="6"
                required
                style={{
                  padding: "12px 14px",
                  background: "#fffdf8",
                  border: "1px solid #d9c3ad",
                  borderRadius: "10px",
                  color: "#1f1813",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "none",
                  transition: "all 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#245860";
                  e.target.style.boxShadow = "0 0 0 3px rgba(36, 88, 96, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d9c3ad";
                  e.target.style.boxShadow = "none";
                }}
              />

              <button
                type="submit"
                className="ps-btn ps-btn-primary"
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                }}
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Contact;
