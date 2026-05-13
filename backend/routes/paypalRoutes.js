const express = require("express");
const axios = require("axios");

const router = express.Router();

const PAYPAL_BASE = process.env.PAYPAL_BASE || "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials not set in environment");

  const token = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const url = `${PAYPAL_BASE}/v1/oauth2/token`;

  const resp = await axios.post(
    url,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return resp.data.access_token;
}

router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: "Missing amount in request body" });

    const accessToken = await getAccessToken();

    const orderResp = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: String(amount),
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({ id: orderResp.data.id });
  } catch (err) {
    console.error("PayPal create-order error:", err.response ? err.response.data : err.message);
    return res.status(500).json({ message: "Failed to create PayPal order" });
  }
});

router.post("/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ message: "Missing orderID in request body" });

    const accessToken = await getAccessToken();

    const cap = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json(cap.data);
  } catch (err) {
    console.error("PayPal capture-order error:", err.response ? err.response.data : err.message);
    return res.status(500).json({ message: "Failed to capture PayPal order" });
  }
});

module.exports = router;
