const nodemailer = require("nodemailer");
const db = require("../db/connection");
const { buildOrderEmailHtml, formatMoney } = require("./emailTemplatesClean");

const createGmailTransporter = () => {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").trim();

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: (process.env.EMAIL_HOST || "smtp.gmail.com").trim(),
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: {
      user,
      pass,
    },
  });
};

const getFromAddress = () => {
  const fromAddress = (
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    ""
  ).trim();

  if (!fromAddress) {
    return null;
  }

  const displayName = (process.env.EMAIL_FROM_NAME || "Plage Surf").trim();
  return `"${displayName}" <${fromAddress}>`;
};

const sendInvoiceEmail = async (order) => {
  const orderId = Number(order?.orderId ?? order?.id);
  const userId = Number(order?.userId ?? order?.user_id ?? order?.user);

  console.log("[invoice] preparing invoice email", {
    orderId: orderId || null,
    userId: userId || null,
    paypalOrderId: order?.paypalOrderId || null,
  });

  if (!orderId || !userId) {
    throw new Error("orderId and userId are required to send invoice email");
  }

  const transporter = createGmailTransporter();

  if (!transporter) {
    throw new Error("Email configuration is missing");
  }

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

  console.log("[invoice] fetched order record", {
    orderId,
    userId,
    found: Boolean(orderRecord),
  });

  if (!orderRecord) {
    throw new Error("Order not found for invoice email");
  }

  const customerEmail = (
    orderRecord.customer_email ||
    orderRecord.email ||
    process.env.EMAIL_USER ||
    ""
  ).trim();

  console.log("[invoice] fetching customer email", {
    orderId,
    userId,
    email: customerEmail || null,
  });

  if (!customerEmail) {
    throw new Error("Customer email not found for invoice email");
  }

  try {
    await transporter.verify();
    console.log("[invoice] SMTP transporter verified", {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT || 587),
      to: customerEmail,
    });
  } catch (verifyError) {
    console.error("[invoice] SMTP verification failed", {
      error: verifyError.message,
      stack: verifyError.stack,
    });
    throw verifyError;
  }

  const [itemRows] = await db.query(
    `
      SELECT
        oi.id,
        oi.quantity,
        oi.price,
        oi.name,
        p.name AS product_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `,
    [orderId],
  );

  console.log("[invoice] fetched order items", {
    orderId,
    itemCount: itemRows.length,
  });

  const items = itemRows.map((item) => {
    const quantity = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;

    return {
      name: item.product_name || item.name,
      quantity,
      price,
      subtotal: price * quantity,
    };
  });

  const total = Number(orderRecord.total) || 0;
  const html = buildOrderEmailHtml({
    customerName: orderRecord.username || "Surfer",
    orderId: orderRecord.id,
    orderDate: orderRecord.created_at,
    paymentStatus: "Paid",
    transactionId: order?.paypalOrderId || orderRecord.id,
    currency: "USD",
    items,
    subtotal: total,
    shipping: 0,
    tax: 0,
    total,
    viewOrderUrl: "#",
  });

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: customerEmail,
      subject: `Invoice for order #${orderRecord.id} | Plage Surf`,
      html,
      text: [
        `Hi ${orderRecord.username || "Surfer"},`,
        "",
        `Thank you for your payment. Your invoice for order #${orderRecord.id} is attached in this email.`,
        `Total: ${formatMoney(total, "USD")}`,
        "Payment status: Paid",
      ].join("\n"),
    });

    console.log("[invoice] email sent successfully", {
      orderId,
      to: customerEmail,
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (emailError) {
    console.error("[invoice] email send failed", {
      orderId,
      to: customerEmail,
      error: emailError.message,
      stack: emailError.stack,
    });

    throw emailError;
  }
};

module.exports = {
  sendInvoiceEmail,
};
