import React, { useCallback, useEffect, useState } from "react";

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

import ManageCustomers from "./pages/ManageCustomers";

import AdminDashboard from "./pages/AdminDashboard";

import Profile from "./pages/Profile";

import MyOrders from "./pages/MyOrders";



const normalizeCartItems = (items = []) =>

  (Array.isArray(items) ? items : []).map((item) => {

    if (item?.product) {

      const product = item.product;

      const productId = product.id || product._id;



      return {

        ...product,

        id: productId,

        _id: productId,

        size: product.size || item.size || "",

        quantity: Number(item.quantity) || 1,

      };

    }



    const productId = item?.id || item?._id;



    return {

      ...item,

      id: productId,

      _id: productId,

      size: item.size || item?.product?.size || "",

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

  const [currentPage, setCurrentPage] = useState("login");

  const [selectedCategory, setSelectedCategory] = useState("");

  const [selectedOrderFilter, setSelectedOrderFilter] = useState("all");

  const [selectedProductToEdit, setSelectedProductToEdit] = useState(null);

  const [cartItems, setCartItems] = useState([]);
  const [cartSuccessMessage, setCartSuccessMessage] = useState("");
  const [cartErrorMessage, setCartErrorMessage] = useState("");
  const [showCartSuccessModal, setShowCartSuccessModal] = useState(false);
  const [showCartErrorModal, setShowCartErrorModal] = useState(false);
  const [maxQuantityPerUser, setMaxQuantityPerUser] = useState(10);

  const [paymentSuccess, setPaymentSuccess] = useState(null);



  const handleSessionUpdate = useCallback((nextUser) => {

    setSession((previousSession) => {

      if (!previousSession) {

        return previousSession;

      }



      const updatedSession = {

        ...previousSession,

        user: {

          ...previousSession.user,

          ...nextUser,

        },

      };



      localStorage.setItem("session", JSON.stringify(updatedSession));

      return updatedSession;

    });

  }, []);



  // Restore the saved session so refreshes keep the user logged in.

  // If a session exists, admin users are taken to the admin dashboard.

  useEffect(() => {

    const loadMaxQuantityPerUser = async () => {
      try {
        const response = await axios.get("/api/admin/settings/max_quantity_per_user");
        const value = Number(response.data?.value || 10);
        setMaxQuantityPerUser(value);
      } catch (error) {
        console.error("Failed to load max quantity per user:", error);
      }
    };

    loadMaxQuantityPerUser();

    const savedSession = localStorage.getItem("session");

    if (savedSession) {

      const parsedSession = JSON.parse(savedSession);

      const normalizedGender =

        parsedSession.preferredGender === "female" ? "female" : "male";

      const restoredSession = {

        ...parsedSession,

        preferredGender: normalizedGender,

      };



      setSession(restoredSession);



      // For non-admin users, ensure profile data is fresh before rendering home

      if (parsedSession.token && parsedSession.user?.role !== "admin") {

        axios

          .get("/api/auth/profile", {

            headers: {

              Authorization: `Bearer ${parsedSession.token}`,

            },

          })

          .then((response) => {

            const profileUser = response.data.user || response.data;

            handleSessionUpdate(profileUser);

          })

          .catch(() => {

            // Keep the restored session if the profile lookup fails.

          });

      }



      setCurrentPage(

        parsedSession.user?.role === "admin" ? "admin-dashboard" : "home",

      );

    }

    // Handle PayPal redirect token (approval) present in URL

    try {

      const params = new URLSearchParams(window.location.search);

      const token = params.get("token");

      const isPaypalCancel = params.has("paypalCancel");

      const paypalSuccess = params.has("paypalSuccess");

      const paypalUnsuccessful = params.has("paypalUnsuccessful");

      const returnedOrderId = params.get("orderId");



      if (paypalSuccess) {

        setPaymentSuccess({

          title: "Thank you for ordering from Plage Surf",

          message:

            "Your payment has been captured successfully. Your order is being prepared now.",

          orderId: returnedOrderId || "-",

        });

      }

      // Only show unsuccessful message if there's no token to attempt capture
      if (paypalUnsuccessful && !token) {

        setPaymentSuccess({

          title: "Payment could not be completed",

          message:

            "Your PayPal checkout was not completed. The order was marked as cancelled.",

          orderId: returnedOrderId || token || "-",

        });

      }



      if (token) {

        // If user is signed in, attempt capture immediately

        const sessionStr = localStorage.getItem("session");

        const saved = sessionStr ? JSON.parse(sessionStr) : null;

        if (!saved || !saved.token) {

          alert("Please sign in to complete PayPal payment.");

        } else {

          (async () => {

            try {

              if (isPaypalCancel) {

                await axios.post(

                  "/api/cart/paypal/cancel",

                  { orderID: token },

                  { headers: { Authorization: `Bearer ${saved.token}` } },

                );



                setPaymentSuccess({

                  title: "Checkout cancelled",

                  message:

                    "You cancelled PayPal checkout before payment was completed.",

                  orderId: token,

                });

              } else {

                const resp = await axios.post(

                  "/api/cart/paypal/capture",

                  { orderID: token },

                  { headers: { Authorization: `Bearer ${saved.token}` } },

                );



                setPaymentSuccess({

                  title: "Thank you for ordering from Plage Surf",

                  message:

                    "Your payment has been captured successfully. Your order is being prepared now.",

                  orderId: resp.data?.order?.id || token,

                });

                // refresh cart items after capture

                const refreshed = await axios.get("/api/cart", {

                  headers: { Authorization: `Bearer ${saved.token}` },

                });

                setCartItems(normalizeCartItems(refreshed.data));

              }

            } catch (err) {

              console.error("PayPal return handling error:", err?.response || err);

              setPaymentSuccess({

                title: isPaypalCancel ? "Checkout cancelled" : "Payment could not be completed",

                message:

                  err?.response?.data?.message ||

                  "Please try again or contact support if the issue continues.",

                orderId: token,

              });

            }

          })();

        }

      }



      if (token || isPaypalCancel || paypalSuccess || paypalUnsuccessful) {

        window.history.replaceState(null, "", window.location.pathname);

      }

    } catch (e) {

      // ignore

    }

  }, [handleSessionUpdate]);



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

  const handleNavigate = (page, categoryOrData) => {

    const isAdmin = session?.user?.role === "admin";



    if (

      [

        "manage-orders",

        "manage-products",

        "manage-customers",

        "admin-dashboard",

      ].includes(page) &&

      !isAdmin

    ) {

      setCurrentPage("home");

      return;

    }



    if (page === "manage-products") {

      if (categoryOrData && typeof categoryOrData === "object") {

        setSelectedProductToEdit(categoryOrData);

        setCurrentPage(page);

        return;

      }

      setSelectedProductToEdit(null);

    } else {

      setSelectedProductToEdit(null);

    }

 ////////

    if (

      isAdmin &&

      ["home", "shop", "size-charts", "contact", "products", "cart"].includes(

        page,

      )

    ) {

      setCurrentPage("admin-dashboard");

      return;

    }



    setCurrentPage(page);

    if (page === "manage-orders" && typeof categoryOrData === "string") {

      setSelectedOrderFilter(categoryOrData);

    }



    if (page !== "manage-orders" && typeof categoryOrData !== "undefined") {

      setSelectedCategory(categoryOrData);

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

        { productId, quantity: 1, size: productOrCart?.size || "" },

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
      setShowCartSuccessModal(true);
      return true;

    } catch (error) {

      console.error("Add to cart failed:", error.message);
      const errorMsg = error.response?.data?.message || error.message;
      setCartErrorMessage(errorMsg);
      setShowCartErrorModal(true);
      return false;

    }

  };



  const handleRemoveFromCart = async (productId, size = "") => {

    if (!productId || !session?.token) {

      return;

    }



    try {

      const response = await axios.delete(`/api/cart/${productId}`, {

        headers: {

          Authorization: `Bearer ${session.token}`,

        },

        params: size ? { size } : undefined,

      });



      const updatedCart = normalizeCartItems(response.data);

      setCartItems(updatedCart);

    } catch (error) {

      console.error("Remove from cart failed:", error.message);

    }

  };



  const handleUpdateCartQuantity = async (productId, quantity, size = "") => {

    if (!productId || !session?.token) {

      return;

    }



    try {

      const response = await axios.patch(

        `/api/cart/${productId}`,

        { quantity },

        {

          headers: {

            Authorization: `Bearer ${session.token}`,

          },

          params: size ? { size } : undefined,

        },

      );



      setCartItems(normalizeCartItems(response.data));

    } catch (error) {

      console.error("Update cart quantity failed:", error.message);

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



  const dismissPaymentSuccess = () => {

    setPaymentSuccess(null);

  };



  const paymentSuccessModal = paymentSuccess ? (

    <div

      className="ps-cartConfirmBackdrop"

      onClick={dismissPaymentSuccess}

      role="presentation"

    >

      <div

        className="ps-cartConfirmCard"

        role="dialog"

        aria-modal="true"

        aria-label="Payment confirmation"

        onClick={(event) => event.stopPropagation()}

        style={{

          maxWidth: "520px",

          width: "calc(100% - 32px)",

          padding: "28px",

        }}

      >

        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>

          <div

            style={{

              width: "44px",

              height: "44px",

              borderRadius: "50%",

              background: "linear-gradient(135deg, #003087 0%, #0070e0 100%)",

              color: "#fff",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              fontSize: "22px",

              fontWeight: 800,

              flexShrink: 0,

              boxShadow: "0 10px 18px rgba(0, 48, 135, 0.18)",

            }}

          >

            ✓

          </div>



          <div style={{ flex: 1 }}>

            <h2 className="ps-cartConfirmTitle" style={{ marginBottom: "8px" }}>

              {paymentSuccess.title}

            </h2>

            {paymentSuccess.title !== "Payment could not be completed" && (
              <p className="ps-cartConfirmText" style={{ marginBottom: "8px" }}>

                {paymentSuccess.message}

              </p>
            )}

            {paymentSuccess.title !== "Payment could not be completed" && (
              <p

                style={{ margin: "0 0 18px", color: "#65574d", fontSize: "13px" }}

              >

                Order reference: {paymentSuccess.orderId}

              </p>
            )}

          </div>



          <button

            type="button"

            onClick={dismissPaymentSuccess}

            aria-label="Close payment confirmation"

            style={{

              border: "none",

              background: "transparent",

              fontSize: "28px",

              lineHeight: 1,

              color: "#8b7f74",

              cursor: "pointer",

              padding: 0,

            }}

          >

            ×

          </button>

        </div>



        <div

          style={{

            display: "flex",

            gap: "12px",

            flexWrap: "wrap",

            marginTop: "8px",

          }}

        >

          <button

            type="button"

            className="ps-btn ps-btn-primary"

            onClick={() => {

              dismissPaymentSuccess();

              setCurrentPage("home");

            }}

            style={{ padding: "12px 18px", background: "#000000" }}

          >

            Continue shopping

          </button>

          {paymentSuccess.title !== "Payment could not be completed" && (
            <button

              type="button"

              className="ps-btn ps-btn-primary"

              onClick={() => {

                dismissPaymentSuccess();

                setCurrentPage("my-orders");

              }}

              style={{ padding: "12px 18px", background: "#245860" }}

            >

              View Order

            </button>
          )}

          <button

            type="button"

            className="ps-btn ps-btn-secondary"

            onClick={dismissPaymentSuccess}

            style={{ padding: "12px 18px" }}

          >

            Close

          </button>

        </div>

      </div>

    </div>

  ) : null;



  const withPaymentSuccessModal = (content) => (

    <>

      {content}

      {paymentSuccessModal}

    </>

  );



  if (!session) {

    return withPaymentSuccessModal(

      <Login

        onLoginSuccess={(authSession) => {

          const nextSession = {

            ...authSession,

            preferredGender: "male",

          };



          localStorage.setItem("session", JSON.stringify(nextSession));

          setSession(nextSession);

          setCurrentPage(

            authSession.user?.role === "admin" ? "admin-dashboard" : "home",

          );

        }}

        onNavigate={setCurrentPage}

      />,

    );

  }



  // Each page is rendered manually because the app uses role-aware shell logic.

  // The admin pages are only reachable when the user role is admin.

  if (currentPage === "home") {

    return withPaymentSuccessModal(

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

        cartSuccessMessage={cartSuccessMessage}

        cartErrorMessage={cartErrorMessage}

        onClearCartSuccessMessage={() => setCartSuccessMessage("")}

        onClearCartErrorMessage={() => setCartErrorMessage("")}

        showCartSuccessModal={showCartSuccessModal}

        onCloseCartSuccessModal={() => setShowCartSuccessModal(false)}

        showCartErrorModal={showCartErrorModal}

        onCloseCartErrorModal={() => setShowCartErrorModal(false)}

        maxQuantityPerUser={maxQuantityPerUser}

      />,

    );

  }



  if (currentPage === "shop") {

    return withPaymentSuccessModal(

      <Shop

        user={session.user}

        preferredGender={preferredGender}

        currentPage={currentPage}

        onNavigate={handleNavigate}

        onPreferredGenderChange={handlePreferredGenderChange}

        onLogout={logout}

        cartCount={cartCount}

      />,

    );

  }



  if (currentPage === "contact") {

    return withPaymentSuccessModal(

      <Contact

        user={session.user}

        preferredGender={preferredGender}

        currentPage={currentPage}

        onNavigate={handleNavigate}

        onPreferredGenderChange={handlePreferredGenderChange}

        onLogout={logout}

        cartCount={cartCount}

      />,

    );

  }



  if (currentPage === "profile") {

    return withPaymentSuccessModal(

      <Profile

        session={session}

        user={session.user}

        preferredGender={preferredGender}

        currentPage={currentPage}

        onNavigate={handleNavigate}

        onPreferredGenderChange={handlePreferredGenderChange}

        onLogout={logout}

        cartCount={cartCount}

        onSessionUpdate={handleSessionUpdate}

      />,

    );

  }



  if (currentPage === "size-charts") {

    return withPaymentSuccessModal(

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

        cartSuccessMessage={cartSuccessMessage}

        cartErrorMessage={cartErrorMessage}

        onClearCartSuccessMessage={() => setCartSuccessMessage("")}

        onClearCartErrorMessage={() => setCartErrorMessage("")}

        showCartSuccessModal={showCartSuccessModal}

        onCloseCartSuccessModal={() => setShowCartSuccessModal(false)}

        showCartErrorModal={showCartErrorModal}

        onCloseCartErrorModal={() => setShowCartErrorModal(false)}

        maxQuantityPerUser={maxQuantityPerUser}

      />,

    );

  }



  if (currentPage === "products") {

    return withPaymentSuccessModal(

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

        cartSuccessMessage={cartSuccessMessage}

        cartErrorMessage={cartErrorMessage}

        onClearCartSuccessMessage={() => setCartSuccessMessage("")}

        onClearCartErrorMessage={() => setCartErrorMessage("")}

        showCartSuccessModal={showCartSuccessModal}

        onCloseCartSuccessModal={() => setShowCartSuccessModal(false)}

        showCartErrorModal={showCartErrorModal}

        onCloseCartErrorModal={() => setShowCartErrorModal(false)}

        maxQuantityPerUser={maxQuantityPerUser}

      />,

    );

  }



  if (currentPage === "cart") {

    return withPaymentSuccessModal(

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

        onUpdateCartQuantity={handleUpdateCartQuantity}

        cartCount={cartCount}

      />,

    );

  }



  if (currentPage === "my-orders") {

    return withPaymentSuccessModal(

      <MyOrders

        session={session}

        user={session.user}

        onNavigate={handleNavigate}

      />,

    );

  }



  if (currentPage === "manage-orders") {

    return withPaymentSuccessModal(

      <ManageOrders

        session={session}

        currentPage={currentPage}

        onNavigate={handleNavigate}

        preferredGender={preferredGender}

        onPreferredGenderChange={handlePreferredGenderChange}

        onLogout={logout}

        cartCount={cartCount}

        initialFilter={selectedOrderFilter}

      />,

    );

  }



  if (currentPage === "manage-products") {

    return withPaymentSuccessModal(

      <ManageProducts

        session={session}

        currentPage={currentPage}

        onNavigate={handleNavigate}

        preferredGender={preferredGender}

        onPreferredGenderChange={handlePreferredGenderChange}

        onLogout={logout}

        cartCount={cartCount}

        initialProductToEdit={selectedProductToEdit}

      />,

    );

  }



  if (currentPage === "manage-customers") {

    return withPaymentSuccessModal(

      <ManageCustomers

        session={session}

        currentPage={currentPage}

        onNavigate={handleNavigate}

        preferredGender={preferredGender}

        onPreferredGenderChange={handlePreferredGenderChange}

        onLogout={logout}

        cartCount={cartCount}

      />,

    );

  }



  if (currentPage === "admin-dashboard") {

    return withPaymentSuccessModal(

      <AdminDashboard

        session={session}

        currentPage={currentPage}

        onNavigate={handleNavigate}

        preferredGender={preferredGender}

        onPreferredGenderChange={handlePreferredGenderChange}

        onLogout={logout}

        cartCount={cartCount}

        onOpenOrders={(filter) => {

          setSelectedOrderFilter(filter);

          setCurrentPage("manage-orders");

        }}

      />,

    );

  }



  return null;

}



export default App;

