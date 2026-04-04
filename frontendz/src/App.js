import React, { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Contact from "./pages/Contact";
import Products from "./pages/SurfSpots";

function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const savedSession = localStorage.getItem("session");
    if (savedSession) {
      setSession(JSON.parse(savedSession));
      setCurrentPage("home");
    }
  }, []);

  const handleNavigate = (page, category = "") => {
    setCurrentPage(page);
    if (category) {
      setSelectedCategory(category);
    }
  };

  const handleAddToCart = (product) => {
    const existingItem = cartItems.find((item) => item.id === product.id);
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  if (!session) {
    return (
      <Login
        onLoginSuccess={(authSession) => {
          localStorage.setItem("session", JSON.stringify(authSession));
          setSession(authSession);
          setCurrentPage("home");
        }}
      />
    );
  }

  if (currentPage === "home") {
    return (
      <Home
        user={session.user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={() => {
          localStorage.removeItem("session");
          setSession(null);
        }}
        cartCount={cartItems.length}
      />
    );
  }

  if (currentPage === "shop") {
    return (
      <Shop
        user={session.user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={() => {
          localStorage.removeItem("session");
          setSession(null);
        }}
        cartCount={cartItems.length}
      />
    );
  }

  if (currentPage === "contact") {
    return (
      <Contact
        user={session.user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={() => {
          localStorage.removeItem("session");
          setSession(null);
        }}
        cartCount={cartItems.length}
      />
    );
  }

  if (currentPage === "products") {
    return (
      <Products
        session={session}
        currentPage={currentPage}
        selectedCategory={selectedCategory}
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onNavigate={handleNavigate}
        onLogout={() => {
          localStorage.removeItem("session");
          setSession(null);
        }}
        cartCount={cartItems.length}
      />
    );
  }
}

export default App;
