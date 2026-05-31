/*
  Email service using Nodemailer to send order confirmation emails.
  - Location: backend/services/emailService.js
  - Exports: sendOrderConfirmation({ orderId, userId, paypalOrderId })

  Notes:
  - Reads SMTP credentials from environment variables: EMAIL_USER, EMAIL_PASS
  - Uses existing emailTemplates to build a modern HTML email
  - Logs errors but never throws in normal operation (caller may still catch)
*/

const nodemailer = require('nodemailer');
const db = require('../db/connection');
const { buildOrderEmailHtml, formatMoney } = require('../utils/emailTemplates');

// Create an SMTP transporter using env vars. Uses Gmail by default.
const createTransporter = () => {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').trim();

  if (!user || !pass) {
    console.error('[emailService] EMAIL_USER or EMAIL_PASS not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: (process.env.EMAIL_HOST || 'smtp.gmail.com').trim(),
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: { user, pass },
  });
};

const getFromAddress = () => {
  const from = (process.env.EMAIL_FROM || process.env.EMAIL_USER || '').trim();
  const name = (process.env.EMAIL_FROM_NAME || 'Plage Surf').trim();
  return `${name} <${from}>`;
};

/**
 * Send a confirmation email for a saved order.
 * Caller must ensure the order exists and was persisted.
 * @param {Object} opts
 * @param {number} opts.orderId - MySQL order id
 * @param {number} opts.userId - User id who placed the order
 * @param {string} [opts.paypalOrderId] - Optional PayPal order id for reference
 */
const sendOrderConfirmation = async ({ orderId, userId, paypalOrderId = null }) => {
  if (!orderId || !userId) {
    console.error('[emailService] orderId and userId are required');
    return { success: false, reason: 'missing-parameters' };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, reason: 'transporter-missing' };
  }

  try {
    // Fetch order and user info
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
      console.error('[emailService] order not found', { orderId, userId });
      return { success: false, reason: 'order-not-found' };
    }

    const customerEmail = (
      orderRecord.customer_email || orderRecord.email || process.env.EMAIL_USER || ''
    ).trim();

    if (!customerEmail) {
      console.error('[emailService] customer email missing for order', { orderId });
      return { success: false, reason: 'customer-email-missing' };
    }

    // Load order items
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

    const items = itemRows.map((r) => ({
      name: r.product_name || r.name,
      quantity: Number(r.quantity) || 1,
      finalPrice: Number(r.price) || 0,
      subtotal: (Number(r.price) || 0) * (Number(r.quantity) || 1),
    }));

    const total = Number(orderRecord.total) || 0;

    // Build HTML using shared template
    const html = buildOrderEmailHtml({
      customerName: orderRecord.username || 'Surfer',
      orderId: orderRecord.id,
      orderDate: orderRecord.created_at,
      paymentStatus: (orderRecord.status || '').toString(),
      transactionId: paypalOrderId || orderRecord.id,
      currency: process.env.PAYPAL_CURRENCY || 'USD',
      items,
      subtotal: total,
      shipping: 0,
      tax: 0,
      total,
      viewOrderUrl: '#',
    });

    // Send the email. Failure should not affect order persistence.
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error('[emailService] SMTP verify failed', verifyErr.message || verifyErr);
      // continue to attempt sending; some providers do not support verify
    }

    const mailOptions = {
      from: getFromAddress(),
      to: customerEmail,
      subject: `Order confirmation #${orderRecord.id} | Plage Surf`,
      html,
      text: `Thank you for your order #${orderRecord.id}. Total: ${formatMoney(total)}. Status: ${orderRecord.status}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[emailService] order confirmation sent', { orderId, to: customerEmail, messageId: info.messageId });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[emailService] failed to send order confirmation', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
};

module.exports = {
  sendOrderConfirmation,
};
const nodemailer = require("nodemailer");

/**
 * Email Service Module
 * Handles sending order confirmation emails using Nodemailer with Gmail SMTP
 */

// Debug: Log email configuration on startup
console.log("[email:init] Initializing email service...");
console.log(
  "[email:init] EMAIL_USER configured:",
  process.env.EMAIL_USER ? "✓" : "✗"
);
console.log(
  "[email:init] EMAIL_PASS configured:",
  process.env.EMAIL_PASS ? "✓" : "✗"
);
console.log("[email:init] EMAIL_HOST:", process.env.EMAIL_HOST || "smtp.gmail.com");
console.log("[email:init] EMAIL_PORT:", process.env.EMAIL_PORT || 587);

// Trim and validate credentials to handle spaces in app passwords
const EMAIL_USER = (process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || "").trim();

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error(
    "[email:init] ✗ CRITICAL: EMAIL_USER or EMAIL_PASS is not set in .env"
  );
}

// Initialize Nodemailer transporter with Gmail SMTP configuration
// Uses environment variables for secure credential management
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // TLS (true for 465, false for other ports)
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Test transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("[email:verify] TRANSPORTER VERIFICATION FAILED:", error.message);
  } else {
    console.log("[email:verify] TRANSPORTER VERIFIED: Ready to send emails ✓");
  }
});

/**
 * Generates a professional HTML email template for order confirmation
 * @param {Object} data - Order confirmation data
 * @returns {string} - HTML email template
 */
const generateOrderConfirmationHTML = (data) => {
  const {
    customerName,
    orderId,
    orderDate,
    items,
    totalAmount,
    orderStatus,
  } = data;

  // Format order date to readable format (e.g., "May 31, 2026")
  const formattedDate = new Date(orderDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate table rows for each item in the order
  const itemsHTML = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; font-family: Arial, sans-serif;">
        ${item.name}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: center; font-family: Arial, sans-serif;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; font-family: Arial, sans-serif;">
        $${parseFloat(item.price).toFixed(2)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; font-family: Arial, sans-serif; font-weight: bold;">
        $${(parseFloat(item.price) * item.quantity).toFixed(2)}
      </td>
    </tr>
  `
    )
    .join("");

  // HTML email template with inline CSS for maximum email client compatibility
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Surf Shop</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <!-- Main Container -->
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header with Surf Shop Branding -->
          <div style="background: linear-gradient(135deg, #0066cc 0%, #004499 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🏄 SURF SHOP</h1>
            <p style="color: #e6f2ff; margin: 8px 0 0 0; font-size: 14px;">Ride the Waves</p>
          </div>

          <!-- Content Section -->
          <div style="padding: 40px 30px;">
            
            <!-- Thank You Message -->
            <h2 style="color: #333333; margin: 0 0 10px 0; font-size: 24px;">Thank You for Your Order!</h2>
            <p style="color: #666666; margin: 0 0 30px 0; line-height: 1.6; font-size: 14px;">
              Hi <strong>${customerName}</strong>,<br>
              Your order has been successfully placed. We're excited to get your new surf gear to you soon!
            </p>

            <!-- Order Details Box -->
            <div style="background-color: #f0f8ff; border-left: 4px solid #0066cc; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="color: #333333; margin: 0 0 8px 0; font-size: 14px;">
                <strong>Order ID:</strong> #${orderId}
              </p>
              <p style="color: #333333; margin: 0 0 8px 0; font-size: 14px;">
                <strong>Order Date:</strong> ${formattedDate}
              </p>
              <p style="color: #333333; margin: 0; font-size: 14px;">
                <strong>Status:</strong> <span style="background-color: #28a745; color: #ffffff; padding: 4px 8px; border-radius: 3px; font-weight: bold;">${orderStatus}</span>
              </p>
            </div>

            <!-- Order Summary Table -->
            <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f0f8ff;">
                  <th style="padding: 12px; text-align: left; color: #0066cc; font-weight: bold; border-bottom: 2px solid #0066cc; font-family: Arial, sans-serif;">Product</th>
                  <th style="padding: 12px; text-align: center; color: #0066cc; font-weight: bold; border-bottom: 2px solid #0066cc; font-family: Arial, sans-serif;">Qty</th>
                  <th style="padding: 12px; text-align: right; color: #0066cc; font-weight: bold; border-bottom: 2px solid #0066cc; font-family: Arial, sans-serif;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; color: #0066cc; font-weight: bold; border-bottom: 2px solid #0066cc; font-family: Arial, sans-serif;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <!-- Total Amount Highlighted -->
            <div style="background-color: #fafafa; padding: 20px; border-radius: 4px; text-align: right; margin: 20px 0;">
              <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px;">Subtotal: <strong>$${totalAmount}</strong></p>
              <div style="border-top: 2px solid #0066cc; padding-top: 10px;">
                <p style="color: #0066cc; margin: 0; font-size: 18px; font-weight: bold;">
                  Total Amount: <span style="color: #28a745; font-size: 24px;">$${parseFloat(totalAmount).toFixed(2)}</span>
                </p>
              </div>
            </div>

            <!-- Additional Information -->
            <p style="color: #666666; margin: 30px 0 15px 0; line-height: 1.6; font-size: 14px;">
              <strong>What's Next?</strong><br>
              Your order is now being processed. You'll receive a shipping confirmation with tracking details via email as soon as your items are dispatched.
            </p>

            <!-- Contact Information -->
            <p style="color: #999999; margin: 20px 0 0 0; line-height: 1.6; font-size: 12px;">
              If you have any questions about your order, please don't hesitate to contact our customer service team.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
            <p style="color: #999999; margin: 0 0 8px 0; font-size: 12px;">
              &copy; 2026 Surf Shop. All rights reserved.
            </p>
            <p style="color: #999999; margin: 0; font-size: 12px;">
              <a href="http://localhost:3000" style="color: #0066cc; text-decoration: none;">Visit Our Website</a> | 
              <a href="mailto:support@surfshop.com" style="color: #0066cc; text-decoration: none;">Contact Support</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return htmlTemplate;
};

/**
 * Sends an order confirmation email to the customer
 * This function retrieves order details from the database and sends a professional HTML email
 *
 * @param {Object} params - Email parameters
 * @param {string} params.customerEmail - Customer's email address
 * @param {string} params.customerName - Customer's full name
 * @param {number} params.orderId - Order ID from database
 * @param {Object[]} params.items - Array of order items with product details
 * @param {number} params.totalAmount - Total order amount
 * @param {string} params.orderStatus - Order status (e.g., 'successful')
 * @returns {Promise<void>}
 */
const sendOrderConfirmation = async ({
  customerEmail,
  customerName,
  orderId,
  items,
  totalAmount,
  orderStatus,
}) => {
  try {
    console.log(
      `[email:send] Starting email send process for Order #${orderId}...`
    );

    // Validate required parameters
    if (!customerEmail) {
      console.error(
        `[email:send] ✗ Customer email is missing for Order #${orderId}`
      );
      return;
    }

    console.log(`[email:send] Email address: ${customerEmail}`);

    if (!orderId) {
      console.error("[email:send] ✗ Order ID is missing");
      return;
    }

    if (!items || items.length === 0) {
      console.error(`[email:send] ✗ Order items are missing for Order #${orderId}`);
      return;
    }

    console.log(
      `[email:send] Generating HTML template for Order #${orderId}...`
    );

    // Prepare email data object
    const emailData = {
      customerName: customerName || "Valued Customer",
      orderId,
      orderDate: new Date().toISOString(),
      items,
      totalAmount,
      orderStatus: orderStatus || "pending",
    };

    // Generate HTML email content
    const htmlContent = generateOrderConfirmationHTML(emailData);

    // Configure email options
    const mailOptions = {
      from: `"Surf Shop" <${EMAIL_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation - Order #${orderId}`,
      html: htmlContent,
      // Plain text fallback for email clients that don't support HTML
      text: `
        Thank you for your order!
        
        Order ID: #${orderId}
        Status: ${orderStatus}
        Total Amount: $${parseFloat(totalAmount).toFixed(2)}
        
        Order Details:
        ${items.map((item) => `- ${item.name} x${item.quantity}: $${(parseFloat(item.price) * item.quantity).toFixed(2)}`).join("\n")}
        
        Thank you for shopping with Surf Shop!
      `,
    };

    console.log("[email:send] Configuration ready. Sending email...");
    console.log(`[email:send] FROM: ${mailOptions.from}`);
    console.log(`[email:send] TO: ${mailOptions.to}`);
    console.log(`[email:send] SUBJECT: ${mailOptions.subject}`);

    // Send email through Nodemailer transporter
    const info = await transporter.sendMail(mailOptions);

    console.log(
      `[email:send] ✓ Order confirmation sent successfully to ${customerEmail}`
    );
    console.log(`[email:send] Message ID: ${info.messageId}`);
    console.log(`[email:send] Response: ${info.response}`);
  } catch (error) {
    // Log error but don't throw - we don't want to cancel the order if email fails
    console.error(`[email:send] ✗ FAILED to send email for Order #${orderId}`);
    console.error("[email:send] ERROR TYPE:", error.code || error.name);
    console.error("[email:send] ERROR MESSAGE:", error.message);

    if (error.response) {
      console.error("[email:send] SMTP RESPONSE:", error.response);
    }

    if (error.code === "EAUTH") {
      console.error(
        "[email:send] ⚠️ AUTHENTICATION FAILED - Check EMAIL_USER and EMAIL_PASS in .env"
      );
      console.error(
        "[email:send] ⚠️ For Gmail, use an App Password, not your regular password"
      );
    }

    if (error.code === "ECONNREFUSED") {
      console.error("[email:send] ⚠️ CONNECTION REFUSED - Check email server settings");
    }

    console.error(
      "[email:send] ⚠️ Order was completed successfully, but email delivery failed"
    );
  }
};

module.exports = {
  sendOrderConfirmation,
  generateOrderConfirmationHTML,
};
