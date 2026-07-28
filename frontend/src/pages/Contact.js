/**
 * Contact Page
 * Contact information page for bulk orders and customer support
 * Displays contact details for users who need to place large orders
 */
import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./Contact.css";

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

      <main className="ps-main contact-page-main">
        <div className="ps-shell">
          <div className="contact-hero">
            <p className="ps-pill">Get in touch</p>
            <h1 className="ps-title">Contact us</h1>
            <p className="ps-lead">
              Reach the Plage Surf team for orders, products, or sizing help.
            </p>
          </div>

          <div className="contact-cards">
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
              <div key={item.title} className="ps-surface contact-card">
                <div className="contact-card-icon">
                  {item.icon}
                </div>
                <h3 className="contact-card-title">
                  {item.title}
                </h3>
                <p className="contact-card-value">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="contact-panel">
            <h2 className="contact-panel-title">
              Send us a Message
            </h2>

            <form
              className="contact-form"
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
                className="contact-input"
              />

              <input
                type="email"
                placeholder="Your Email"
                required
                className="contact-input"
              />

              <input
                type="text"
                placeholder="Subject"
                required
                className="contact-input"
              />

              <textarea
                placeholder="Your Message"
                rows="6"
                required
                className="contact-textarea"
              />

              <button type="submit" className="ps-btn ps-btn-primary">
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
