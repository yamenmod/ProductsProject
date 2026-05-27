const db = require("../db/connection");

// Key/value settings store used by the admin panel.

const getSetting = async (req, res) => {
  try {
    // Read a single setting by key.
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: "Setting key is required" });
    }

    const [rows] = await db.query("SELECT value FROM settings WHERE key_name = ?", [key]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Setting not found" });
    }

    res.json({ key, value: rows[0].value });
  } catch (error) {
    console.error("Get setting error:", error);
    res.status(500).json({ error: "Failed to retrieve setting" });
  }
};

const getAllSettings = async (req, res) => {
  try {
    // Load every setting and convert the rows into an object.
    const [rows] = await db.query("SELECT key_name, value FROM settings");

    const settings = {};
    rows.forEach((row) => {
      settings[row.key_name] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error("Get all settings error:", error);
    res.status(500).json({ error: "Failed to retrieve settings" });
  }
};

const updateSetting = async (req, res) => {
  try {
    // Update one setting at a time using an upsert.
    const { key } = req.params;
    const { value } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Setting key is required" });
    }

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Setting value is required" });
    }

    // Validate VAT rate if updating it
    if (key === "vat_rate") {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 1) {
        return res.status(400).json({ error: "VAT rate must be a number between 0 and 1" });
      }
    }

    await db.query(
      "INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?",
      [key, value, value]
    );

    res.json({ key, value });
  } catch (error) {
    console.error("Update setting error:", error);
    res.status(500).json({ error: "Failed to update setting" });
  }
};

module.exports = {
  getSetting,
  getAllSettings,
  updateSetting,
};
