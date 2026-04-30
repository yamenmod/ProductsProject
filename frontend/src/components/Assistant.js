import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

function Assistant({ session, user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { from: "user", text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = session?.token;
      const response = await axios.post(
        "/api/assistant",
        { message: userMsg.text },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "X-Source-Page": "assistant",
          },
        },
      );

      const reply = response.data?.reply || "Sorry, I couldn't get a response.";
      setMessages((m) => [...m, { from: "agent", text: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { from: "agent", text: "Error contacting assistant." }]);
      console.error("Assistant error", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "user") {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 2000,
        }}
      >
        {open ? (
          <div
            className="ps-assistantCard"
            style={{
              width: 340,
              height: 420,
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                background: "#1f1813",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <strong>Plage Assistant</strong>
                <div style={{ fontSize: 11, opacity: 0.9 }}>Customer help</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setMessages([]);
                  }}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "#fff",
                    cursor: "pointer",
                  }}
                  aria-label="Clear chat"
                >
                  Clear
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: "transparent", border: 0, color: "#fff", cursor: "pointer" }}
                  aria-label="Close assistant"
                >
                  ×
                </button>
              </div>
            </div>

            <div ref={listRef} style={{ padding: 10, overflowY: "auto", flex: 1, background: "#fbf9f7" }}>
              {messages.length === 0 && (
                <div style={{ color: "#6b645f", fontSize: 13 }}>Hi {user?.username || "there"}! Ask me about products, shipping, or returns.</div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ marginTop: 8, display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                  <div
                    style={{
                      background: m.from === "user" ? "#1f1813" : "#fff",
                      color: m.from === "user" ? "#fff" : "#1f1813",
                      padding: "8px 10px",
                      borderRadius: 8,
                      maxWidth: "78%",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      fontSize: 14,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 10, borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={loading ? "Thinking..." : "Ask about products, sizes, shipping..."}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" }}
                disabled={loading}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()} className="ps-btn ps-btn-primary" style={{ padding: "8px 12px" }}>
                {loading ? "…" : "Send"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-label="Open assistant"
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#1f1813",
              color: "#fff",
              border: 0,
              boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
              cursor: "pointer",
              fontSize: 22,
            }}
          >
            💬
          </button>
        )}
      </div>
    </>
  );
}

export default Assistant;
