/**
 * Contact Page
 * Contact information page for bulk orders and customer support
 * Displays contact details for users who need to place large orders
 */
import React, { useState } from "react";
import axios from "axios";
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitStatus(null);
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage("");

    try {
      const response = await axios.post("/api/contact/submit", formData);
      
      if (response.status === 200) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      }
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(
        error.response?.data?.message || 
        "Failed to send message. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
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
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                required
                className="contact-input"
              />

              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="contact-input"
              />

              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="contact-input"
              />

              <textarea
                name="message"
                placeholder="Your Message"
                value={formData.message}
                onChange={handleChange}
                rows="6"
                required
                className="contact-textarea"
              />

              <button 
                type="submit" 
                className="ps-btn ps-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>

              {submitStatus === "success" && (
                <p className="ps-lead" style={{ color: "#166534", marginTop: "16px" }}>
                  Thank you for your message! We'll be in touch soon.
                </p>
              )}

              {submitStatus === "error" && (
                <p className="ps-lead" style={{ color: "#991b1b", marginTop: "16px" }}>
                  {errorMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Contact;
