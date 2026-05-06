import React, { useState, useEffect } from "react";
import axios from "axios";

function ResetPassword({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("passwordResetEmail") || "";
    const savedCode = sessionStorage.getItem("passwordResetCode") || "";
    setEmail(savedEmail);
    setCode(savedCode);
  }, []);

  const handleReset = async () => {
    setMessage("");

    if (!email || !code || !password) {
      setMessage("Please complete the reset form.");
      return;
    }
    if (password.trim().length < 4) {
      setMessage("New password must be at least 4 characters.");
      return;
    }

    setLoading(true);

    try {
      await axios.post("/api/auth/reset-password", {
        email,
        code,
        newPassword: password,
      });

      setMessage("Password updated. Please sign in.");
      sessionStorage.removeItem("passwordResetEmail");
      sessionStorage.removeItem("passwordResetCode");
      setTimeout(() => onNavigate("login"), 900);
    } catch (error) {
      setMessage(error.response?.data?.message || "Server error.");
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
            Create a new password for your account.
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
            <input type="text" value={code} disabled style={{ opacity: 0.7 }} />
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
              New Password
            </label>
            <input
              placeholder="Enter your new password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <button
            className="ps-btn ps-btn-secondary"
            onClick={() => onNavigate("login")}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
