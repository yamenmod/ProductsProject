const nodemailer = require("nodemailer");
const db = require("../db/connection");

const {
  buildOrderEmailHtml,
  formatMoney,
} = require("../utils/emailTemplatesClean");

const {
  splitVatInclusivePricing,
  getVatRateFromDb,
} = require("../utils/pricing");

// ======================================================
// CREATE EMAIL TRANSPORTER
// ======================================================

const createTransporter = () => {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").trim();
  const host = (process.env.EMAIL_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.EMAIL_PORT || 587);

  if (!user || !pass) {
    console.error("[emailService] EMAIL_USER or EMAIL_PASS not configured");
    return null;
  }

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("[emailService] EMAIL_HOST or EMAIL_PORT is invalid");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

// ======================================================
// GET FROM ADDRESS
// ======================================================

const getFromAddress = () => {
  const from = (process.env.EMAIL_FROM || process.env.EMAIL_USER || "").trim();

  const name = (process.env.EMAIL_FROM_NAME || "Plage Surf").trim();

  return `${name} <${from}>`;
};

// ======================================================
// ORDER CONFIRMATION EMAIL
// ======================================================

const sendOrderConfirmation = async ({
  orderId,
  userId,
  paypalOrderId = null,
}) => {
  if (!orderId || !userId) {
    console.error("[emailService] orderId and userId are required");

    return {
      success: false,
      reason: "missing-parameters",
    };
  }

  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      reason: "transporter-missing",
    };
  }

  try {
    const [orderRows] = await db.query(
      `
        SELECT
          o.id,
          o.total,
          o.status,
          o.created_at,
          o.customer_email,
          u.username,
          u.email
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
          AND o.user_id = ?
        LIMIT 1
      `,
      [orderId, userId],
    );

    const orderRecord = orderRows[0] || null;

    if (!orderRecord) {
      console.error("[emailService] order not found", {
        orderId,
        userId,
      });

      return {
        success: false,
        reason: "order-not-found",
      };
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

      return {
        success: false,
        reason: "customer-email-missing",
      };
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

    const items = itemRows.map((row) => ({
      name: row.product_name || row.name,
      quantity: Number(row.quantity) || 1,
      finalPrice: Number(row.price) || 0,
      subtotal: (Number(row.price) || 0) * (Number(row.quantity) || 1),
    }));

    const total = Number(orderRecord.total) || 0;

    const vatRate = await getVatRateFromDb(db);

    const pricing = splitVatInclusivePricing(total, vatRate);

    const html = buildOrderEmailHtml({
      customerName: orderRecord.username || "Surfer",
      orderId: orderRecord.id,
      orderDate: orderRecord.created_at,
      paymentStatus: (orderRecord.status || "").toString(),
      transactionId: paypalOrderId || orderRecord.id,
      currency: process.env.PAYPAL_CURRENCY || "USD",
      items,
      subtotal: pricing.basePrice,
      shipping: 0,
      tax: pricing.vatAmount,
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
      text:
        `Thank you for your order #${orderRecord.id}. ` +
        `Total: ${formatMoney(total)}. ` +
        `Status: ${orderRecord.status}`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("[emailService] order confirmation sent", {
      orderId,
      to: customerEmail,
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(
      "[emailService] failed to send order confirmation",
      err.message || err,
    );

    return {
      success: false,
      error: err.message || String(err),
    };
  }
};

// ======================================================
// CONTACT US EMAIL
// ======================================================

const sendContactEmail = async ({ name, email, subject, message }) => {
  if (!name || !email || !subject || !message) {
    console.error(
      "[emailService] name, email, subject, and message are required",
    );

    return {
      success: false,
      reason: "missing-parameters",
    };
  }

  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      reason: "transporter-missing",
    };
  }

  try {
    // ==================================================
    // CUSTOMER CONFIRMATION EMAIL HTML
    // ==================================================

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >

          <title>Plage Surf - Message Received</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }

            .container {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 8px;
            }

            h1 {
              color: #1f1813;
              margin-top: 0;
            }

            .intro {
              margin-bottom: 25px;
            }

            .field {
              margin-bottom: 20px;
            }

            .label {
              font-weight: bold;
              color: #5e5148;
              margin-bottom: 5px;
            }

            .value {
              background: #ffffff;
              padding: 10px;
              border-left: 4px solid #1f1813;
            }

            .message {
              white-space: pre-wrap;
            }

            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>

        <body>

          <div class="container">

            <h1>Thank you for contacting Plage Surf</h1>

            <div class="intro">
              <p>Hi ${name},</p>

              <p>
                We received your message successfully.
                Our team will get back to you as soon as possible.
              </p>

              <p>
                Here is a copy of your message:
              </p>
            </div>

            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${name}</div>
            </div>

            <div class="field">
              <div class="label">Email:</div>
              <div class="value">${email}</div>
            </div>

            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${subject}</div>
            </div>

            <div class="field">
              <div class="label">Your Message:</div>
              <div class="value message">${message}</div>
            </div>

            <div class="footer">
              This email confirms that Plage Surf received
              your Contact Us message.
            </div>

          </div>

        </body>
      </html>
    `;

    // ==================================================
    // VERIFY SMTP CONNECTION
    // ==================================================

    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error(
        "[emailService] SMTP verify failed",
        verifyErr.message || verifyErr,
      );
    }

    // ==================================================
    // EMAIL OPTIONS
    // ==================================================

    const mailOptions = {
      // Plage Surf Gmail sends the email
      from: getFromAddress(),

      // Customer receives the email
      to: email,

      subject: "We received your message | Plage Surf",

      html,

      // Plain text version in case HTML cannot be displayed
      text:
        `Hi ${name},\n\n` +
        `Thank you for contacting Plage Surf.\n` +
        `We received your message successfully and ` +
        `will get back to you as soon as possible.\n\n` +
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Subject: ${subject}\n\n` +
        `Your Message:\n` +
        `${message}\n\n` +
        `Plage Surf`,
    };

    // ==================================================
    // SEND TO CUSTOMER
    // ==================================================

    const info = await transporter.sendMail(mailOptions);

    console.log("[emailService] contact confirmation sent", {
      to: email,
      from: process.env.EMAIL_USER,
      subject,
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(
      "[emailService] failed to send contact confirmation",
      err.message || err,
    );

    return {
      success: false,
      error: err.message || String(err),
    };
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  sendOrderConfirmation,
  sendContactEmail,
};
