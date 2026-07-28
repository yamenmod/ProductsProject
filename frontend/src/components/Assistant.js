import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./Assistant.css";

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
      <div className="ps-assistant-shell">
        {open ? (
          <div className="ps-assistant-card">
            <div className="ps-assistant-header">
              <div>
                <strong className="ps-assistant-title">Plage Assistant</strong>
                <div className="ps-assistant-subtitle">Customer help</div>
              </div>
              <div className="ps-assistant-actions">
                <button
                  onClick={() => {
                    setMessages([]);
                  }}
                  className="ps-assistant-action"
                  aria-label="Clear chat"
                >
                  Clear
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="ps-assistant-action"
                  aria-label="Close assistant"
                >
                  ×
                </button>
              </div>
            </div>

            <div ref={listRef} className="ps-assistant-messages">
              {messages.length === 0 && (
                <div className="ps-assistant-empty">Hi {user?.username || "there"}! Ask me about products, shipping, or returns.</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`ps-assistant-message-row ${m.from}`}>
                  <div className={`ps-assistant-bubble ${m.from}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="ps-assistant-footer">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={loading ? "Thinking..." : "Ask about products, sizes, shipping..."}
                className="ps-assistant-input"
                disabled={loading}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()} className="ps-btn ps-btn-primary ps-assistant-send">
                {loading ? "…" : "Send"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-label="Open assistant"
            className="ps-assistant-toggle"
          >
            💬
          </button>
        )}
      </div>
    </>
  );
}

export default Assistant;
