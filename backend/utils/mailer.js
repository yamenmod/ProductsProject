const nodemailer = require("nodemailer");

const createMailTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "outlook",
    auth: {
      user,
      pass,
    },
  });
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
