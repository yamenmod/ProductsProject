import React, { useState } from "react";
import axios from "axios";

function VerifyResetCode({ onNavigate }) {
  const initialEmail = sessionStorage.getItem("passwordResetEmail") || "";
  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setMessage("");

    if (!email) {
      setMessage("Please start the reset process first.");
      return;
    }
    if (!code) {
      setMessage("Please enter the reset code.");
      return;
    }

    setLoading(true);

    try {
      await axios.post("/api/auth/verify-reset-code", {
        email,
        code,
      });

      sessionStorage.setItem("passwordResetCode", code);
      setMessage("Code verified. Set a new password.");
      onNavigate("reset-password");
    } catch (error) {
      setMessage(error.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-login">
      <div className="ps-login-card ps-surface">
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1
            style={{
              margin: "12px 0 8px",
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: "58px",
              lineHeight: 0.9,
              letterSpacing: "1.2px",
            }}
          >
            Plage Surf
          </h1>
          <p style={{ margin: 0, color: "#65574d", fontWeight: 600 }}>
            Verify the reset code sent to your email.
          </p>
        </div>

        <div style={{ display: "grid", gap: "14px" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Email
            </label>
            <input type="email" value={email} disabled style={{ opacity: 0.7 }} />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Reset Code
            </label>
            <input
              placeholder="Enter the 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {message && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #d7a495",
                background: "#fff0ec",
                color: "#8b3529",
                fontWeight: 600,
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              {message}
            </div>
          )}

          <button
            className="ps-btn ps-btn-primary"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify code"}
          </button>

          <button
            className="ps-btn ps-btn-secondary"
            onClick={() => onNavigate("login")}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerifyResetCode;
