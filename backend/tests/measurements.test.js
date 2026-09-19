const test = require("node:test");
const assert = require("node:assert/strict");

const { validateMeasurement } = require("../utils/measurements");

const validCases = [
  ["weight", 30],
  ["weight", 67.5],
  ["weight", 150],
  ["height", 120],
  ["height", 180.5],
  ["height", 220],
];

const invalidCases = [
  ["weight", 29],
  ["weight", 151],
  ["height", 119],
  ["height", 221],
  ["weight", ""],
  ["height", "   "],
  ["weight", 0],
  ["height", 0],
  ["weight", -1],
  ["height", -1],
  ["weight", "not-a-number"],
  ["height", "not-a-number"],
];

for (const [measurement, value] of validCases) {
  test(`accepts ${measurement} value ${value}`, () => {
    assert.equal(validateMeasurement(value, measurement), value);
  });
}

for (const [measurement, value] of invalidCases) {
  test(`rejects ${measurement} value ${JSON.stringify(value)}`, () => {
    assert.throws(
      () => validateMeasurement(value, measurement),
      (error) => error.statusCode === 400,
    );
  });
}
