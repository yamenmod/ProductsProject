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
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        userSelect: "none",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative Wave Pattern - More Realistic */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "200px",
          background:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 1200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%230ea5e9;stop-opacity:0.3'/%3E%3Cstop offset='100%25' style='stop-color:%231e40af;stop-opacity:0.15'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,80 Q150,40 300,80 T600,80 T900,80 T1200,80 L1200,200 L0,200 Z' fill='url(%23grad1)' stroke='%230ea5e9' stroke-width='2' opacity='0.8'/%3E%3Cpath d='M0,100 Q200,60 400,100 T800,100 T1200,100 L1200,200 L0,200 Z' fill='none' stroke='%23e0f2fe' stroke-width='2.5' opacity='0.6'/%3E%3Cpath d='M0,110 Q180,75 360,110 T720,110 T1080,110 T1200,120 L1200,200 L0,200 Z' fill='none' stroke='%230ea5e9' stroke-width='1.5' opacity='0.7'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat-x",
          backgroundSize: "1200px 200px",
          backgroundPosition: "0 0",
          opacity: 1,
          animation: "wave 8s linear infinite",
        }}
      />
      <style>{`
        @keyframes wave {
          0% { background-position: 0 0; }
          100% { background-position: 1200px 0; }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "48px",
          borderRadius: "12px",
          background: "#ffffff",
          boxShadow:
            "0 4px 24px rgba(14, 165, 233, 0.15), 0 2px 8px rgba(0, 0, 0, 0.06)",
          userSelect: "none",
          position: "relative",
          zIndex: 1,
          borderTop: "3px solid #0ea5e9",
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: "36px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "40px",
              marginBottom: "12px",
            }}
          >
            🏄
          </div>
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "28px",
              fontWeight: "700",
              color: "#1e40af",
              letterSpacing: "-0.5px",
            }}
          >
            Surf Shop
          </h1>
          <p
            style={{
              margin: "0",
              fontSize: "14px",
              color: "#0ea5e9",
              fontWeight: "500",
            }}
          >
            {isRegister ? "Join the community" : "Welcome back"}
          </p>
        </div>

        {/* Form */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e40af",
              marginBottom: "8px",
            }}
          >
            Username
          </label>
          <input
            placeholder="Enter your username"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #bee3f8",
              fontSize: "14px",
              fontFamily: "inherit",
              userSelect: "none",
              transition: "all 0.2s ease",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#0ea5e9";
              e.target.style.boxShadow = "0 0 0 3px rgba(14, 165, 233, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#bee3f8";
              e.target.style.boxShadow = "none";
            }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {isRegister && (
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#1e40af",
                marginBottom: "8px",
              }}
            >
              Email Address
            </label>
            <input
              placeholder="Enter your email"
              type="email"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #bee3f8",
                fontSize: "14px",
                fontFamily: "inherit",
                userSelect: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#0ea5e9";
                e.target.style.boxShadow = "0 0 0 3px rgba(14, 165, 233, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#bee3f8";
                e.target.style.boxShadow = "none";
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        <div style={{ marginBottom: "28px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#1e40af",
              marginBottom: "8px",
            }}
          >
            Password
          </label>
          <input
            placeholder="Enter your password"
            type="password"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #bee3f8",
              fontSize: "14px",
              fontFamily: "inherit",
              userSelect: "none",
              transition: "all 0.2s ease",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#0ea5e9";
              e.target.style.boxShadow = "0 0 0 3px rgba(14, 165, 233, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#bee3f8";
              e.target.style.boxShadow = "none";
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Alert Message */}
        {message && (
          <div
            style={{
              padding: "12px 16px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#991b1b",
              marginBottom: "24px",
              textAlign: "center",
              userSelect: "none",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {message}
          </div>
        )}

        {/* Primary Button */}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "11px 16px",
            background: "#0ea5e9",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontWeight: "700",
            fontSize: "15px",
            cursor: "pointer",
            marginBottom: "12px",
            userSelect: "none",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "#0284c7";
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 16px rgba(14, 165, 233, 0.25)";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "#0ea5e9";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          {isRegister ? "Create Account" : "Sign In"}
        </button>

        {/* Secondary Button */}
        <button
          onClick={() => setIsRegister(!isRegister)}
          style={{
            width: "100%",
            padding: "11px 16px",
            background: "#f0f9ff",
            border: "1.5px solid #bee3f8",
            borderRadius: "8px",
            color: "#1e40af",
            fontSize: "15px",
            cursor: "pointer",
            userSelect: "none",
            fontWeight: "700",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "#e0f2fe";
            e.target.style.borderColor = "#0ea5e9";
            e.target.style.color = "#0284c7";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "#f0f9ff";
            e.target.style.borderColor = "#bee3f8";
            e.target.style.color = "#1e40af";
          }}
        >
          {isRegister
            ? "Already have an account? Sign In"
            : "Create an Account"}
        </button>

        {/* Footer Text */}
        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "12px",
            color: "#64748b",
            margin: "24px 0 0 0",
          }}
        >
          By continuing, you agree to our{" "}
          <span
            style={{ color: "#0ea5e9", cursor: "pointer", fontWeight: "600" }}
          >
            Terms of Service
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
