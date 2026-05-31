const nodemailer = require("nodemailer");

// Create transporter with SMTP configuration
const createTransporter = () => {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").trim();

  if (!user || !pass) {
    console.error("[email] EMAIL_USER or EMAIL_PASS is missing");
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

// Send order confirmation email
const sendOrderEmail = async (customerEmail, order) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return { success: false, error: "Email configuration is missing" };
    }

    // Extract buyer name from PayPal order data
    const buyerName = order.payer?.name?.given_name || "Surfer";

    // Email content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Plage Surf</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f4f4f4;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
          }
          .thank-you {
            font-size: 18px;
            color: #28a745;
            margin: 20px 0;
          }
          .order-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .order-id {
            font-size: 16px;
            font-weight: bold;
            color: #007bff;
          }
          .payment-status {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
          }
          .wave {
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏄‍♂️ Plage Surf</div>
            <h1>Order Confirmation</h1>
          </div>

          <p class="thank-you">Hi ${buyerName},</p>
          <p>Thank you for your order! Your payment has been successfully processed.</p>

          <div class="order-details">
            <p><strong>Order ID:</strong> <span class="order-id">${order.id}</span></p>
            <p><strong>Payment Status:</strong> <span class="payment-status">Paid ✔</span></p>
          </div>

          <p>Your order is being prepared and will be shipped soon. You'll receive another email with tracking information once your order ships.</p>

          <div class="footer">
            <p>Ride the wave 🌊</p>
            <p>Plage Surf - Your Surfing Essentials</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Plage Surf" <${(process.env.EMAIL_USER || "waseemyamen1@gmail.com").trim()}>`,
      to: customerEmail,
      subject: "Thank you for your order 🏄‍♂️ | Plage Surf",
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[email] Order confirmation sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[email] Failed to send order confirmation:", error.message);
    // Don't throw error to avoid breaking the payment flow
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOrderEmail,
};
