const nodemailer = require("nodemailer");
const db = require("../db/connection");
const {
  buildOrderEmailHtml,
  formatMoney,
} = require("../utils/emailTemplatesClean");

const createTransporter = () => {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").trim();

  if (!user || !pass) {
    console.error("[emailService] EMAIL_USER or EMAIL_PASS not configured");
    return null;
  }

  return nodemailer.createTransport({
    host: (process.env.EMAIL_HOST || "smtp.gmail.com").trim(),
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: { user, pass },
  });
};

const getFromAddress = () => {
  const from = (process.env.EMAIL_FROM || process.env.EMAIL_USER || "").trim();
  const name = (process.env.EMAIL_FROM_NAME || "Plage Surf").trim();
  return `${name} <${from}>`;
};

const sendOrderConfirmation = async ({
  orderId,
  userId,
  paypalOrderId = null,
}) => {
  if (!orderId || !userId) {
    console.error("[emailService] orderId and userId are required");
    return { success: false, reason: "missing-parameters" };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, reason: "transporter-missing" };
  }

  try {
    const [orderRows] = await db.query(
      `
        SELECT o.id, o.total, o.status, o.created_at, o.customer_email, u.username, u.email
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ? AND o.user_id = ?
        LIMIT 1
      `,
      [orderId, userId],
    );

    const orderRecord = orderRows[0] || null;
    if (!orderRecord) {
      console.error("[emailService] order not found", { orderId, userId });
      return { success: false, reason: "order-not-found" };
    }

    const customerEmail = (
      orderRecord.customer_email ||
      orderRecord.email ||
      process.env.EMAIL_USER ||
      ""
    ).trim();

    if (!customerEmail) {
      console.error("[emailService] customer email missing for order", {
        orderId,
      });
      return { success: false, reason: "customer-email-missing" };
    }

    const [itemRows] = await db.query(
      `
        SELECT oi.id, oi.quantity, oi.price, oi.name, p.name AS product_name
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
      `,
      [orderId],
    );

    const items = itemRows.map((row) => ({
      name: row.product_name || row.name,
      quantity: Number(row.quantity) || 1,
      finalPrice: Number(row.price) || 0,
      subtotal: (Number(row.price) || 0) * (Number(row.quantity) || 1),
    }));

    const total = Number(orderRecord.total) || 0;

    const html = buildOrderEmailHtml({
      customerName: orderRecord.username || "Surfer",
      orderId: orderRecord.id,
      orderDate: orderRecord.created_at,
      paymentStatus: (orderRecord.status || "").toString(),
      transactionId: paypalOrderId || orderRecord.id,
      currency: process.env.PAYPAL_CURRENCY || "USD",
      items,
      subtotal: total,
      shipping: 0,
      tax: 0,
      total,
      viewOrderUrl: "#",
    });

    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error(
        "[emailService] SMTP verify failed",
        verifyErr.message || verifyErr,
      );
    }

    const mailOptions = {
      from: getFromAddress(),
      to: customerEmail,
      subject: `Order confirmation #${orderRecord.id} | Plage Surf`,
      html,
      text: `Thank you for your order #${orderRecord.id}. Total: ${formatMoney(total)}. Status: ${orderRecord.status}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[emailService] order confirmation sent", {
      orderId,
      to: customerEmail,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(
      "[emailService] failed to send order confirmation",
      err.message || err,
    );
    return { success: false, error: err.message || String(err) };
  }
};

module.exports = {
  sendOrderConfirmation,
};
