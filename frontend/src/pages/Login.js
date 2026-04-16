import React, { useState } from "react";
import axios from "axios";

function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setMessage("");

    // check if fields r empty
    if (isRegister) {
      // registration checks
      if (!username || !password || !email) {
        setMessage("⚠️ All fields are required! (Username, Email, Password)");
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
    } else {
      // login checks
      if (!username || !password) {
        setMessage("⚠️ Username and password are required!");
        return;
      }
    }

    try {
      const url = isRegister ? "/api/auth/register" : "/api/auth/login";

      const body = isRegister
        ? { username, password, email }
        : { username, password };

      const res = await axios.post(url, body); //Connects to backend using POST request, sending user data

      if (res.data.message === "success") {
        onLoginSuccess({ token: res.data.token, user: res.data.user });
      } else {
        setMessage(res.data.message); // Backend returned error message (like Server Error)
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Server Error"); //Backend connection failed (network error, server down, or invalid response)
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
              Username
            </label>
            <input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {isRegister && (
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
              <input
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Password
            </label>
            <input
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
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

        <div style={{ display: "grid", gap: "10px", marginTop: "18px" }}>
          <button className="ps-btn ps-btn-primary" onClick={handleSubmit}>
            {isRegister ? "Create Account" : "Sign In"}
          </button>
          <button
            className="ps-btn ps-btn-secondary"
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
