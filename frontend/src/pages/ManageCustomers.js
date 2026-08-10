/**
 * Manage Customers Page
 * Admin-only page for viewing and managing customer accounts
 * Features search functionality and customer activation status management
 */
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { STATUS_COLORS } from "../utils/statusColors";

function ManageCustomers({
  session,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingUsername, setPendingUsername] = useState("");
  const [pendingNextIsActive, setPendingNextIsActive] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      setUsers(response.data);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          loadError.message ||
          "Unable to load customers",
      );
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const isActive = Number(user.is_active) === 1;

    // Filter by status
    if (statusFilter === "active" && !isActive) {
      return false;
    }
    if (statusFilter === "inactive" && isActive) {
      return false;
    }

    // Filter by search term
    if (!normalizedSearch) {
      return true;
    }

    return [user.username, user.email].some((value) =>
      (value || "").toString().toLowerCase().includes(normalizedSearch),
    );
  });

  const formatJoinedDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  const clearPendingAction = () => {
    setShowConfirmModal(false);
    setPendingUserId(null);
    setPendingUsername("");
    setPendingNextIsActive(null);
  };

  const handleConfirmStatusChange = async () => {
    try {
      const response = await axios.put(
        `/api/users/${pendingUserId}/status`,
        {
          is_active: pendingNextIsActive === 1,
        },
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );

      setActionMessage(
        response.data.message ||
          (pendingNextIsActive === 1
            ? "Customer activated successfully."
            : "Customer unactivated successfully."),
      );
      clearPendingAction();
      loadUsers();
    } catch (statusError) {
      setActionMessage(
        statusError.response?.data?.message ||
          statusError.message ||
          "Unable to update customer status",
      );
      clearPendingAction();
    }
  };

  const openStatusDialog = (user) => {
    const nextIsActive = Number(user.is_active) === 1 ? 0 : 1;

    setPendingUserId(user.id);
    setPendingUsername(user.username);
    setPendingNextIsActive(nextIsActive);
    setShowConfirmModal(true);
  };

  const closeStatusDialog = () => {
    clearPendingAction();
  };

  return (
    <div className="ps-page">
      <Header
        user={session.user}
        preferredGender={preferredGender}
        onPreferredGenderChange={onPreferredGenderChange}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        cartCount={cartCount}
      />

      <main className="ps-main" style={{ padding: "70px 0" }}>
        <div className="ps-shell">
          <div style={{ marginBottom: "20px" }}>
            <h1
              className="ps-title"
              style={{
                marginBottom: "10px",
                fontSize: "clamp(22px, 3vw, 32px)",
              }}
            >
              Manage customers
            </h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              View every registered customer and control whether an account is
              active.
            </p>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by username or email"
              style={{
                width: "100%",
                maxWidth: "520px",
                padding: "12px 14px",
                border: "1px solid rgba(31, 24, 19, 0.14)",
                borderRadius: "12px",
                background: "rgba(255, 250, 242, 0.95)",
                fontSize: "13px",
              }}
            />
          </div>

          <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={{
                fontSize: "12px",
                padding: "8px 16px",
                background: statusFilter === "all" ? "#245860" : "rgba(36, 88, 96, 0.1)",
                color: statusFilter === "all" ? "#fff" : "#245860",
                border: statusFilter === "all" ? "none" : "1px solid #245860",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: statusFilter === "all" ? 600 : 400,
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              style={{
                fontSize: "12px",
                padding: "8px 16px",
                background: statusFilter === "active" ? "#16a34a" : "rgba(22, 163, 74, 0.1)",
                color: statusFilter === "active" ? "#fff" : "#16a34a",
                border: statusFilter === "active" ? "none" : "1px solid #16a34a",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: statusFilter === "active" ? 600 : 400,
              }}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              style={{
                fontSize: "12px",
                padding: "8px 16px",
                background: statusFilter === "inactive" ? "#dc2626" : "rgba(220, 38, 38, 0.1)",
                color: statusFilter === "inactive" ? "#fff" : "#dc2626",
                border: statusFilter === "inactive" ? "none" : "1px solid #dc2626",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: statusFilter === "inactive" ? 600 : 400,
              }}
            >
              Inactive
            </button>
          </div>

          {actionMessage && (
            <div
              className="ps-surface"
              style={{ padding: "16px 18px", marginBottom: "18px" }}
            >
              <p style={{ margin: 0 }}>{actionMessage}</p>
            </div>
          )}

          <div
            className="ps-surface"
            style={{ overflowX: "auto", padding: "22px" }}
          >
            {loading ? (
              <p className="ps-lead">Loading customers...</p>
            ) : error ? (
              <p className="ps-lead" style={{ color: "#991b1b" }}>
                {error}
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ fontSize: "12px" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 10px",
                        color: "#5f5550",
                      }}
                    >
                      Username
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 10px",
                        color: "#5f5550",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 10px",
                        color: "#5f5550",
                      }}
                    >
                      Role
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 10px",
                        color: "#5f5550",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 10px",
                        color: "#5f5550",
                      }}
                    >
                      Joined
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 10px",
                        color: "#5f5550",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isActive = Number(user.is_active) === 1;

                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderTop: "1px solid rgba(31, 24, 19, 0.08)",
                          fontSize: "13px",
                        }}
                      >
                        <td style={{ padding: "14px 10px", color: "#1f1813" }}>
                          {user.username}
                        </td>
                        <td style={{ padding: "14px 10px", color: "#65574d" }}>
                          {user.email}
                        </td>
                        <td style={{ padding: "14px 10px", color: "#1f1813" }}>
                          {user.role}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 700,
                              letterSpacing: "0.02em",
                              background: isActive
                                ? `${STATUS_COLORS.success}1f`
                                : "rgba(153, 27, 27, 0.12)",
                              color: isActive ? STATUS_COLORS.success : "#991b1b",
                            }}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px", color: "#65574d" }}>
                          {formatJoinedDate(user.createdAt || user.created_at)}
                        </td>
                        <td style={{ padding: "14px 10px", textAlign: "right" }}>
                          <button
                            type="button"
                            className="ps-btn ps-btn-secondary"
                            onClick={() => openStatusDialog(user)}
                            style={{
                              fontSize: "12px",
                              background: !isActive
                                ? STATUS_COLORS.success
                                : undefined,
                              borderColor: !isActive
                                ? STATUS_COLORS.success
                                : undefined,
                              color: !isActive ? "#fff" : undefined,
                            }}
                          >
                            {isActive ? "Unactivate User" : "Activate User"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {!loading && !error && filteredUsers.length === 0 && (
              <p style={{ marginTop: "12px", color: "#65574d" }}>
                No customers match your search.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="ps-cartConfirmBackdrop" onClick={closeStatusDialog}>
          <div
            className="ps-cartConfirmCard"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm customer status change"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="ps-cartConfirmTitle">
              {pendingNextIsActive === 1
                ? "Activate User?"
                : "Unactivate User?"}
            </h2>
            <p className="ps-cartConfirmText">
              {pendingNextIsActive === 1
                ? "Are you sure you want to activate this user?"
                : "Are you sure you want to unactivate this user?"}
            </p>
            <div className="ps-cartConfirmActions">
              <button
                type="button"
                className="ps-btn ps-cartConfirmCancel"
                onClick={closeStatusDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ps-btn ps-cartConfirmDelete"
                onClick={handleConfirmStatusChange}
                style={{
                  background:
                    pendingNextIsActive === 0 ? STATUS_COLORS.success : undefined,
                  borderColor:
                    pendingNextIsActive === 0 ? STATUS_COLORS.success : undefined,
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ManageCustomers;
