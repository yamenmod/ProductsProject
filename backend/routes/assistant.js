const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Proxy endpoint for a Google Studio / Generative AI service.
// NOTE: Do NOT commit your API key. Set these env vars on the server:
// - GOOGLE_AI_URL (full URL to the model / inference endpoint)
// - GOOGLE_AI_KEY (the API key)
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "user") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" });
    }

    const aiUrl = process.env.GOOGLE_AI_URL;
    const apiKey = process.env.GOOGLE_AI_KEY;

    if (!aiUrl || !apiKey) {
      return res.status(500).json({ message: "AI service not configured on server" });
    }

    const aiResponse = await axios.post(
      aiUrl,
      { input: message },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    // Be permissive when extracting a textual reply from the AI provider.
    let reply = "";
    if (aiResponse && aiResponse.data) {
      const d = aiResponse.data;
      if (typeof d === "string") reply = d;
      else if (d.outputText) reply = d.outputText;
      else if (d.reply) reply = d.reply;
      else if (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) reply = d.choices[0].message.content;
      else reply = JSON.stringify(d);
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Assistant proxy error:", error.message || error);
    return res.status(500).json({ message: "AI request failed", details: error.message });
  }
});

module.exports = router;
