import React, { useEffect, useState } from "react";
import Login from "./pages/Login";
import Products from "./pages/SurfSpots";

function App() {
  const [session, setSession] = useState(null);
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem("session");
    if (savedSession) {
      setSession(JSON.parse(savedSession));
      setShowProducts(false);
    }
  }, []);

  if (!session) {
    return (
      <Login
        onLoginSuccess={(authSession) => {
          localStorage.setItem("session", JSON.stringify(authSession));
          setSession(authSession);
          setShowProducts(false);
        }}
      />
    );
  }

  if (!showProducts) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #e3f2fd 0%, #b3e5fc 100%)",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "32px",
            width: "360px",
            textAlign: "center",
            boxShadow: "0 12px 40px rgba(10, 61, 98, 0.15)",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#0a3d62" }}>
            Welcome, {session.user.username}
          </h2>
          <p style={{ color: "#1e3a5a", marginBottom: "22px" }}>
            Role: {session.user.role}
          </p>
          <button
            className="primary"
            style={{ width: "100%", marginBottom: "10px" }}
            onClick={() => setShowProducts(true)}
          >
            Products
          </button>
          <button
            style={{ width: "100%" }}
            onClick={() => {
              localStorage.removeItem("session");
              setSession(null);
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <Products
      session={session}
      onBack={() => setShowProducts(false)}
      onLogout={() => {
        localStorage.removeItem("session");
        setSession(null);
      }}
    />
  );
}

export default App;
