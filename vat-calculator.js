const VAT_RATE = 0.18;

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateFromBase(basePrice) {
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error("Base price must be a non-negative number.");
  }

  const vatAmount = round2(basePrice * VAT_RATE);
  const totalPrice = round2(basePrice + vatAmount);

  return {
    mode: "base",
    basePrice: round2(basePrice),
    vatRate: VAT_RATE,
    vatAmount,
    totalPrice,
  };
}

function calculateFromFinal(totalPrice) {
  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    throw new Error("Final price must be a non-negative number.");
  }

  const basePrice = round2(totalPrice / (1 + VAT_RATE));
  const vatAmount = round2(totalPrice - basePrice);

  return {
    mode: "final",
    basePrice,
    vatRate: VAT_RATE,
    vatAmount,
    totalPrice: round2(totalPrice),
  };
}

function printBreakdown(result) {
  console.log("\nIsraeli VAT (Ma'am) Calculator - 18%\n");
  console.log(`Base price (before VAT): ${result.basePrice.toFixed(2)}`);
  console.log(`VAT (18%):              ${result.vatAmount.toFixed(2)}`);
  console.log(`Total price:            ${result.totalPrice.toFixed(2)}\n`);
}

function runCli() {
  const [, , mode, value] = process.argv;

  if (!mode || value === undefined) {
    console.log("Usage:");
    console.log("  node vat-calculator.js base <basePrice>");
    console.log("  node vat-calculator.js final <finalPrice>");
    process.exit(0);
  }

  const numericValue = Number(value);

  try {
    if (mode === "base") {
      const result = calculateFromBase(numericValue);
      printBreakdown(result);
      return;
    }

    if (mode === "final") {
      const result = calculateFromFinal(numericValue);
      printBreakdown(result);
      return;
    }

    throw new Error("Mode must be 'base' or 'final'.");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  VAT_RATE,
  calculateFromBase,
  calculateFromFinal,
  round2,
};
