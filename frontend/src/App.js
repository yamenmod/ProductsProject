import React, { useEffect, useState } from "react";
import axios from "axios";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Contact from "./pages/Contact";
import Products from "./pages/SurfSpots";
import SizeCharts from "./pages/SizeCharts";
import Cart from "./pages/Cart";
import ManageOrders from "./pages/ManageOrders";
import ManageProducts from "./pages/ManageProducts";

const normalizeCartItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => {
    if (item?.product) {
      const product = item.product;
      const productId = product.id || product._id;

      return {
        ...product,
        id: productId,
        _id: productId,
        quantity: Number(item.quantity) || 1,
      };
    }

    const productId = item?.id || item?._id;

    return {
      ...item,
      id: productId,
      _id: productId,
      quantity: Number(item?.quantity) || 1,
    };
  });

const extractProductId = (value) => {
  const rawId =
    value?.id ||
    value?._id ||
    value?.product?.id ||
    value?.product?._id ||
    value?.productId;

  if (rawId === undefined || rawId === null || rawId === "") {
    return null;
  }

  const numericId = Number(rawId);
  return Number.isFinite(numericId) ? numericId : rawId;
};

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
      const parsedSession = JSON.parse(savedSession);
      const normalizedGender =
        parsedSession.preferredGender === "female" ? "female" : "male";
      setSession({
        ...parsedSession,
        preferredGender: normalizedGender,
      });
      setCurrentPage("home");
    }
  }, []);

  useEffect(() => {
    const loadCart = async () => {
      if (!session?.token) {
        setCartItems([]);
        return;
      }

      try {
        const response = await axios.get("/api/cart", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        setCartItems(normalizeCartItems(response.data));
      } catch (error) {
        console.error("Failed to load cart:", error.message);
        setCartItems([]);
      }
    };

    loadCart();
  }, [session?.token]);

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

  // Adds cart items through the backend API so every cart action is persisted.
  // If an API cart array is passed in, we only sync state without another request.
  const handleAddToCart = async (productOrCart) => {
    if (Array.isArray(productOrCart)) {
      setCartItems(normalizeCartItems(productOrCart));
      return true;
    }

    if (!session?.token) {
      return false;
    }

    const productId = extractProductId(productOrCart);

    if (productId === null) {
      return false;
    }

    try {
      await axios.post(
        "/api/cart",
        { productId, quantity: 1 },
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );

      const refreshedCart = await axios.get("/api/cart", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      setCartItems(normalizeCartItems(refreshedCart.data));
      return true;
    } catch (error) {
      console.error("Add to cart failed:", error.message);
      return false;
    }
  };

  const handleRemoveFromCart = async (productId) => {
    if (!productId || !session?.token) {
      return;
    }

    try {
      const response = await axios.delete(`/api/cart/${productId}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      setCartItems(normalizeCartItems(response.data));
    } catch (error) {
      console.error("Remove from cart failed:", error.message);
    }
  };

  const handlePreferredGenderChange = (nextGender) => {
    const normalizedGender = nextGender === "female" ? "female" : "male";

    setSession((previousSession) => {
      if (!previousSession) {
        return previousSession;
      }

      const updatedSession = {
        ...previousSession,
        preferredGender: normalizedGender,
      };

      localStorage.setItem("session", JSON.stringify(updatedSession));
      return updatedSession;
    });
  };

  const preferredGender =
    session?.preferredGender === "female" ? "female" : "male";

  const cartCount = cartItems.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );

  const logout = () => {
    localStorage.removeItem("session");
    setCartItems([]);
    setSession(null);
  };

  if (!session) {
    return (
      <Login
        onLoginSuccess={(authSession) => {
          const nextSession = {
            ...authSession,
            preferredGender: "male",
          };

          localStorage.setItem("session", JSON.stringify(nextSession));
          setSession(nextSession);
          setCurrentPage("home");
        }}
      />
    );
  }

  // Each page is rendered manually because the app uses role-aware shell logic.
  // The admin pages are only reachable when the user role is admin.
  if (currentPage === "home") {
    return (
      <Home
        user={session.user}
        session={session}
        preferredGender={preferredGender}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onAddToCart={handleAddToCart}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
        cartCount={cartCount}
      />
    );
  }

  if (currentPage === "shop") {
    return (
      <Shop
        user={session.user}
        preferredGender={preferredGender}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
        cartCount={cartCount}
      />
    );
  }

  if (currentPage === "contact") {
    return (
      <Contact
        user={session.user}
        preferredGender={preferredGender}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
        cartCount={cartCount}
      />
    );
  }

  if (currentPage === "size-charts") {
    return (
      <SizeCharts
        user={session.user}
        session={session}
        preferredGender={preferredGender}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onAddToCart={handleAddToCart}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
        cartCount={cartCount}
      />
    );
  }

  if (currentPage === "products") {
    return (
      <Products
        session={session}
        preferredGender={preferredGender}
        currentPage={currentPage}
        selectedCategory={selectedCategory}
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onNavigate={handleNavigate}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
        cartCount={cartCount}
      />
    );
  }

  if (currentPage === "cart") {
    return (
      <Cart
        session={session}
        user={session.user}
        preferredGender={preferredGender}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
        cartItems={cartItems}
        onRemoveFromCart={handleRemoveFromCart}
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
        preferredGender={preferredGender}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
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
        preferredGender={preferredGender}
        onPreferredGenderChange={handlePreferredGenderChange}
        onLogout={logout}
        cartCount={cartCount}
      />
    );
  }

  return null;
}

export default App;
