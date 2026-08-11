const { sendContactEmail } = require("../services/emailService");

const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: "All fields are required: name, email, subject, message" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Invalid email address" 
      });
    }

    // Trim and sanitize inputs
    const sanitizedData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    };

    // Validate field lengths
    if (sanitizedData.name.length > 100) {
      return res.status(400).json({ 
        message: "Name is too long (max 100 characters)" 
      });
    }

    if (sanitizedData.subject.length > 200) {
      return res.status(400).json({ 
        message: "Subject is too long (max 200 characters)" 
      });
    }

    if (sanitizedData.message.length > 5000) {
      return res.status(400).json({ 
        message: "Message is too long (max 5000 characters)" 
      });
    }

    // Send email
    const result = await sendContactEmail(sanitizedData);

    if (!result.success) {
      console.error("[contactController] failed to send contact email", result);
      return res.status(500).json({ 
        message: "Failed to send message. Please try again later.",
        error: result.error || result.reason
      });
    }

    console.log("[contactController] contact form submitted successfully", {
      name: sanitizedData.name,
      email: sanitizedData.email,
      subject: sanitizedData.subject,
    });

    return res.status(200).json({ 
      message: "Message sent successfully",
      messageId: result.messageId
    });
  } catch (error) {
    console.error("[contactController] error processing contact form", error);
    return res.status(500).json({ 
      message: "Server error. Please try again later." 
    });
  }
};

module.exports = {
  submitContactForm,
};
