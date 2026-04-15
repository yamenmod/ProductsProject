import React, { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Contact from "./pages/Contact";
import Products from "./pages/SurfSpots";
import ManageOrders from "./pages/ManageOrders";
import ManageProducts from "./pages/ManageProducts";

function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cartItems, setCartItems] = useState([]);

  // Restore the saved session so refreshes keep the user logged in.
  // If a session exists, the app starts on the home page.
  useEffect(() => {
    const savedSession = localStorage.getItem("session");
    if (savedSession) {
      setSession(JSON.parse(savedSession));
      setCurrentPage("home");
    }
  }, []);

  // Central navigation handler used by the header and page buttons.
  // It also blocks non-admin users from opening the admin orders page.
  const handleNavigate = (page, category) => {
    if (
      (page === "manage-orders" || page === "manage-products") &&
      session?.user?.role !== "admin"
    ) {
      setCurrentPage("home");
      return;
    }

    setCurrentPage(page);
    if (typeof category !== "undefined") {
      setSelectedCategory(category);
    }
  };

  // Local cart state is kept in the app shell so every page shares it.
  // This avoids losing the cart when switching between pages.
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

  const cartCount = cartItems.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );

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

  // Each page is rendered manually because the app uses role-aware shell logic.
  // The admin orders page is only reachable when the user role is admin.
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
        cartCount={cartCount}
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
        cartCount={cartCount}
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
        cartCount={cartCount}
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
        cartCount={cartCount}
      />
    );
  }

  if (currentPage === "manage-orders") {
    return (
      <ManageOrders
        session={session}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={() => {
          localStorage.removeItem("session");
          setSession(null);
        }}
        cartCount={cartCount}
      />
    );
  }

  if (currentPage === "manage-products") {
    return (
      <ManageProducts
        session={session}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={() => {
          localStorage.removeItem("session");
          setSession(null);
        }}
        cartCount={cartCount}
      />
    );
  }
}

export default App;
