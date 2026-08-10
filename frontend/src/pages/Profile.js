/**
 * Profile Page
 * User profile page for viewing and editing account details
 * Features weight/height management and profile information updates
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Utility function to sanitize numeric input (weight/height)
const sanitizeNumericInput = (value) => {
  const nextValue = (value || "").toString().replace(/[^0-9.]/g, "");
  const parts = nextValue.split(".");

  if (parts.length <= 2) {
    return `${parts[0] || ""}${parts.length === 2 ? `.${parts[1].replace(/\./g, "")}` : ""}`;
  }

  return `${parts[0] || ""}.${parts.slice(1).join("").replace(/\./g, "")}`;
};

const formatOptionalMeasurement = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return String(value);
};

function Profile({
  session,
  user,
  preferredGender,
  onPreferredGenderChange,
  currentPage,
  onNavigate,
  onLogout,
  cartCount = 0,
  onSessionUpdate,
}) {
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [weight, setWeight] = useState(formatOptionalMeasurement(user?.weight));
  const [height, setHeight] = useState(formatOptionalMeasurement(user?.height));
  const [skillLevel, setSkillLevel] = useState(user?.skillLevel || "beginner");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      try {
        const response = await axios.get("/api/auth/profile", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        if (!isActive) {
          return;
        }

        const profile = response.data.user || response.data;
        setUsername(profile.username || "");
        setEmail(profile.email || "");
        setWeight(formatOptionalMeasurement(profile.weight));
        setHeight(formatOptionalMeasurement(profile.height));
        setSkillLevel(profile.skillLevel || "beginner");

        if (typeof onSessionUpdate === "function") {
          onSessionUpdate(profile);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMessage(
          error.response?.data?.message || "Unable to load your profile.",
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [session.token, onSessionUpdate]);

  const handleSave = async () => {
    setMessage("");

    const trimmedUsername = username.trim();
    const trimmedWeight = weight.trim();
    const trimmedHeight = height.trim();
    const parsedWeight = trimmedWeight === "" ? null : Number(trimmedWeight);
    const parsedHeight = trimmedHeight === "" ? null : Number(trimmedHeight);

    if (!trimmedUsername) {
      setMessage("Username is required.");
      return;
    }

    if (trimmedWeight !== "" && Number.isNaN(parsedWeight)) {
      setMessage("Weight must be a valid number.");
      return;
    }

    if (trimmedHeight !== "" && Number.isNaN(parsedHeight)) {
      setMessage("Height must be a valid number.");
      return;
    }

    setSaving(true);

    try {
      const response = await axios.put(
        "/api/auth/profile",
        {
          username: trimmedUsername,
          weight: parsedWeight,
          height: parsedHeight,
          skillLevel: skillLevel,
        },
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );

      const updatedUser = response.data.user;
      setUsername(updatedUser.username || "");
      setEmail(updatedUser.email || "");
      setWeight(formatOptionalMeasurement(updatedUser.weight));
      setHeight(formatOptionalMeasurement(updatedUser.height));
      setSkillLevel(updatedUser.skillLevel || "beginner");
      setMessage("Profile updated successfully.");

      if (typeof onSessionUpdate === "function") {
        onSessionUpdate(updatedUser);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ps-page ps-profile-page">
      <Header
        user={user}
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
            <p className="ps-pill" style={{ marginBottom: "12px" }}>
              Account settings
            </p>
            <h1 className="ps-title" style={{ marginBottom: "10px" }}>
              Your profile
            </h1>
            <p className="ps-lead" style={{ maxWidth: "760px" }}>
              Keep your account details current so board recommendations can use
              your saved measurements automatically.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
              gap: "22px",
              alignItems: "start",
            }}
          >
            <section className="ps-surface" style={{ padding: "26px" }}>
              {loading ? (
                <p className="ps-lead">Loading your profile...</p>
              ) : (
                <div style={{ display: "grid", gap: "18px" }}>
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
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Update your username"
                    />
                  </div>

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
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      style={{ opacity: 0.72, cursor: "not-allowed" }}
                    />
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "16px",
                      border: "1px solid rgba(31, 24, 19, 0.08)",
                      background: "rgba(247, 239, 229, 0.72)",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 12px",
                        color: "#65574d",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      This might help you for choosing your board
                    </p>

                    <div style={{ display: "grid", gap: "12px" }}>
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "7px",
                            fontWeight: 700,
                            fontSize: "13px",
                          }}
                        >
                          Weight
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={weight}
                          onChange={(event) =>
                            setWeight(sanitizeNumericInput(event.target.value))
                          }
                          placeholder="Add or update your weight"
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "7px",
                            fontWeight: 700,
                            fontSize: "13px",
                          }}
                        >
                          Height
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={height}
                          onChange={(event) =>
                            setHeight(sanitizeNumericInput(event.target.value))
                          }
                          placeholder="Add or update your height"
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "7px",
                            fontWeight: 700,
                            fontSize: "13px",
                          }}
                        >
                          Surf Level
                        </label>
                        <select
                          value={skillLevel}
                          onChange={(event) => setSkillLevel(event.target.value)}
                          style={{
                            padding: "10px 12px",
                            border: "1px solid #d9c3ad",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            width: "100%",
                          }}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {message && (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(36, 88, 96, 0.16)",
                        background: "rgba(124, 201, 205, 0.12)",
                        color: "#1f1813",
                        fontWeight: 600,
                        fontSize: "13px",
                      }}
                    >
                      {message}
                    </div>
                  )}

                  <div
                    style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
                  >
                    <button
                      type="button"
                      className="ps-btn ps-btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      className="ps-btn ps-btn-secondary"
                      onClick={() => onNavigate("home")}
                    >
                      Back to home
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="ps-surface" style={{ padding: "26px" }}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <p
                    className="ps-pill"
                    style={{ marginBottom: "12px", display: "inline-flex" }}
                  >
                    Board profile
                  </p>
                  <h2
                    style={{
                      margin: "0 0 8px",
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontSize: "44px",
                      lineHeight: 0.95,
                      letterSpacing: "1px",
                    }}
                  >
                    Saved sizing
                  </h2>
                  <p className="ps-lead" style={{ marginBottom: 0 }}>
                    When both measurements are saved, the board chooser can skip
                    its manual step and go straight to recommendations.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    padding: "18px",
                    borderRadius: "18px",
                    background:
                      "linear-gradient(180deg, #fffaf2 0%, #f7efe5 100%)",
                    border: "1px solid rgba(31, 24, 19, 0.08)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#65574d",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      Username
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>
                      {username || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "#65574d",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>
                      {email || "-"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "#65574d",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      Weight
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>
                      {weight || "Not set yet"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "#65574d",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      Height
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>
                      {height || "Not set yet"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "#65574d",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      Surf Level
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>
                      {skillLevel || "Not set yet"}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Profile;
