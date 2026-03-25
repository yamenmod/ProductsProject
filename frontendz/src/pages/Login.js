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
        background:
          "linear-gradient(135deg, #0a3d62 0%, #0084b4 50%, #00bfff 100%)",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: "380px",
          padding: "40px",
          borderRadius: "12px",
          background: "#ffffff",
          boxShadow: "0 12px 40px rgba(10, 61, 98, 0.3)",
          userSelect: "none",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              marginBottom: "10px",
            }}
          >
            🌊
          </div>
        </div>
        <h2
          style={{
            textAlign: "center",
            marginBottom: "30px",
            userSelect: "none",
            color: "#0a3d62",
            fontSize: "26px",
            fontWeight: "700",
          }}
        >
          {isRegister ? "Join the Waves" : "Dive In"}
        </h2>

        <input
          placeholder="Username"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "14px",
            borderRadius: "6px",
            border: "2px solid #e0e0e0",
            fontSize: "14px",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            userSelect: "none",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#0084b4")}
          onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {isRegister && (
          <input
            placeholder="Email"
            type="email"
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "14px",
              borderRadius: "6px",
              border: "2px solid #e0e0e0",
              fontSize: "14px",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              userSelect: "none",
              transition: "border-color 0.3s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#0084b4")}
            onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}

        <input
          placeholder="Password"
          type="password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "6px",
            border: "2px solid #e0e0e0",
            fontSize: "14px",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            userSelect: "none",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#0084b4")}
          onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(135deg, #0084b4 0%, #00a8e8 100%)",
            border: "none",
            borderRadius: "6px",
            color: "white",
            fontWeight: "700",
            cursor: "pointer",
            marginBottom: "12px",
            userSelect: "none",
            fontSize: "15px",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 16px rgba(0, 132, 180, 0.3)";
          }}
          onMouseOut={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "none";
          }}
        >
          {isRegister ? "Create Account" : "Login"}
        </button>

        <button
          onClick={() => setIsRegister(!isRegister)}
          style={{
            width: "100%",
            padding: "12px",
            background: "#f0f0f0",
            border: "2px solid #0084b4",
            borderRadius: "6px",
            color: "#0084b4",
            cursor: "pointer",
            userSelect: "none",
            fontWeight: "700",
            fontSize: "15px",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "#0084b4";
            e.target.style.color = "white";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "#f0f0f0";
            e.target.style.color = "#0084b4";
          }}
        >
          {isRegister ? "Back to Login" : "Create Account"}
        </button>

        {message && (
          <div
            style={{
              padding: "14px 16px",
              background: "#ffebee",
              border: "2px solid #d32f2f",
              borderRadius: "6px",
              color: "#d32f2f",
              marginTop: "16px",
              textAlign: "center",
              userSelect: "none",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
