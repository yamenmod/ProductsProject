const MEASUREMENT_LIMITS = {
  weight: { label: "Weight", minimum: 30, maximum: 150, unit: "kg" },
  height: { label: "Height", minimum: 120, maximum: 220, unit: "cm" },
};

const validateMeasurement = (value, measurement) => {
  const limits = MEASUREMENT_LIMITS[measurement];

  if (!limits) {
    throw new Error(`Unknown measurement: ${measurement}`);
  }

  if (value === undefined || value === null || String(value).trim() === "") {
    const error = new Error(`${limits.label} is required.`);
    error.statusCode = 400;
    throw error;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    const error = new Error(`${limits.label} must be a valid number.`);
    error.statusCode = 400;
    throw error;
  }

  if (numericValue < limits.minimum || numericValue > limits.maximum) {
    const error = new Error(
      `${limits.label} must be between ${limits.minimum} ${limits.unit} and ${limits.maximum} ${limits.unit}.`,
    );
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
};

module.exports = { MEASUREMENT_LIMITS, validateMeasurement };
