export const MEASUREMENT_LIMITS = {
  weight: { label: "Weight", minimum: 30, maximum: 150, unit: "kg" },
  height: { label: "Height", minimum: 120, maximum: 220, unit: "cm" },
};

export const getMeasurementValidationError = (
  value,
  measurement,
  { optional = false } = {},
) => {
  const limits = MEASUREMENT_LIMITS[measurement];

  if (!limits) {
    return "Unknown measurement.";
  }

  if (value === undefined || value === null || String(value).trim() === "") {
    return optional ? "" : `${limits.label} is required.`;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return `${limits.label} must be a valid number.`;
  }

  if (numericValue < limits.minimum || numericValue > limits.maximum) {
    return `${limits.label} must be between ${limits.minimum} ${limits.unit} and ${limits.maximum} ${limits.unit}.`;
  }

  return "";
};
