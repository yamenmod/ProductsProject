const nodemailer = require("nodemailer");

const createMailTransporter = () => {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").trim();
  const host = (process.env.EMAIL_HOST || "").trim();
  const port = Number(process.env.EMAIL_PORT || 0);
  const secure = port === 465;

  if (!user || !pass) {
    return null;
  }

  const transportConfig = {
    auth: { user, pass },
  };

  if (host) {
    transportConfig.host = host;
  }

  if (port) {
    transportConfig.port = port;
    transportConfig.secure = secure;
  }

  if (!secure) {
    transportConfig.tls = { rejectUnauthorized: false };
  }

  return nodemailer.createTransport(transportConfig);
};

const getMailFromAddress = () => {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!fromAddress) {
    return null;
  }

  const displayName = process.env.EMAIL_FROM_NAME || "Plage Surf";
  return `"${displayName}" <${fromAddress}>`;
};

module.exports = {
  createMailTransporter,
  getMailFromAddress,
};
