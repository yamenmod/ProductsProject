import React from "react";

function Footer() {
  return (
    <footer className="ps-footer">
      <div className="ps-footer-inner">
        <div>
          <h4>Plage Surf</h4>
          <p>
            Inspired by coastal mornings. Built for riders who want dependable
            gear and a clean shopping flow.
          </p>
        </div>

        <div>
          <h4>Collection</h4>
          <p>Boards selected for both first waves and technical sessions.</p>
          <p>Wetsuits and apparel designed for comfort near the water.</p>
        </div>

        <div>
          <h4>Contact</h4>
          <p>Email: support@plagesurf.com</p>
          <p>Phone: +1 (555) 123-4567</p>
          <p>Mon-Sat: 9:00 AM - 6:00 PM</p>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(31, 24, 19, 0.12)",
          textAlign: "center",
          color: "#4e433c",
          fontSize: "13px",
          padding: "14px 0 18px",
        }}
      >
        © 2026 Plage Surf. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
