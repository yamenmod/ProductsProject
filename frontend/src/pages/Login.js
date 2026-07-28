/**
 * Login/Register Page
 * Authentication page for user login and registration
 * Supports both login and new user registration with optional profile details
 */
import React, { useState } from "react";
import axios from "axios";
import "./Login.css";

// Utility function to sanitize numeric input (weight/height)
const sanitizeNumericInput = (value) => {
  const nextValue = (value || "").toString().replace(/[^0-9.]/g, "");
  const decimalParts = nextValue.split(".");

  if (decimalParts.length <= 2) {
    return `${decimalParts[0] || ""}${decimalParts.length === 2 ? `.${decimalParts[1].replace(/\./g, "")}` : ""}`;
  }

  return `${decimalParts[0] || ""}.${decimalParts.slice(1).join("").replace(/\./g, "")}`;
};

const normalizeOptionalNumber = (value) => {
  const trimmedValue = (value || "").trim();

  if (!trimmedValue) {
    return null;
  }

  const numericValue = Number(trimmedValue);

  return Number.isFinite(numericValue) ? numericValue : NaN;
};

function Login({ onLoginSuccess, onNavigate }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setMessage("");

    // for register we start here

    if (isRegister) {
      if (!username || !password || !email) {
        setMessage("⚠️ All fields are required! (Username, Email, Password)");
        return;
      }

      const normalizedWeight = normalizeOptionalNumber(weight);
      const normalizedHeight = normalizeOptionalNumber(height);

      if (weight.trim() && Number.isNaN(normalizedWeight)) {
        setMessage("⚠️ Weight must be a valid number!");
        return;
      }

      if (height.trim() && Number.isNaN(normalizedHeight)) {
        setMessage("⚠️ Height must be a valid number!");
        return;
      }

      if (username.trim().length < 3) {
        setMessage("⚠️ Username must be at least 3 characters!");
        return;
      }
      if (password.trim().length < 4) {
        setMessage("⚠️ Password must be at least 4 characters!");
        return;
      }
      if (!email.includes("@")) {
        setMessage("⚠️ Please enter a valid email address!");
        return;
      }

      try {
        const res = await axios.post("/api/auth/register", {
          username,
          password,
          email,
          weight: normalizedWeight,
          height: normalizedHeight,
        });

        if (res.data.message === "success") {
          onLoginSuccess({ token: res.data.token, user: res.data.user });
        } else {
          setMessage(res.data.message);
        }
      } catch (err) {
        setMessage(err.response?.data?.message || "Server Error");
      }

      return;
    }
    // if we got here then this is the login
    if (!username || !password) {
      setMessage("⚠️ Username and password are required!");
      return;
    }

    try {
      const res = await axios.post("/api/auth/login", {
        username,
        password,
      });

      if (res.data.message === "success") {
        onLoginSuccess({ token: res.data.token, user: res.data.user });
      } else {
        setMessage(res.data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Server Error");
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
            {isRegister ? "Join the lineup" : "Sign in for your next session"}
          </p>
        </div>

        <div className="login-form">
          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {isRegister && (
            <>
              <div className="login-field">
                <label className="login-label">Email</label>
                <input
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="login-help-card">
                <p className="login-help-title">
                  This might help you for choosing your board
                </p>

                <div className="login-help-grid">
                  <div className="login-field">
                    <label className="login-label">Weight</label>
                    <input
                      placeholder="Optional weight"
                      inputMode="decimal"
                      value={weight}
                      onChange={(e) =>
                        setWeight(sanitizeNumericInput(e.target.value))
                      }
                      type="text"
                    />
                  </div>

                  <div className="login-field">
                    <label className="login-label">Height</label>
                    <input
                      placeholder="Optional height"
                      inputMode="decimal"
                      value={height}
                      onChange={(e) =>
                        setHeight(sanitizeNumericInput(e.target.value))
                      }
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <div className="login-message">
            {message}
          </div>
        )}

        <div className="login-actions">
          <button className="ps-btn ps-btn-primary" onClick={handleSubmit}>
            {isRegister ? "Create Account" : "Sign In"}
          </button>
          <button
            className="ps-btn ps-btn-secondary login-toggle-button"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? "Already registered? Sign In" : "Create an Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
