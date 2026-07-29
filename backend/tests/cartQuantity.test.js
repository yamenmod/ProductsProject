const test = require('node:test');
const assert = require('node:assert/strict');

const { validateProductQuantityLimit } = require('../utils/cartQuantity');

test('allows multiple different products to reach the same max quantity independently', () => {
  const productA = validateProductQuantityLimit({
    currentQuantity: 0,
    requestedQuantity: 9,
    maxQuantityPerProduct: 9,
  });
  const productB = validateProductQuantityLimit({
    currentQuantity: 0,
    requestedQuantity: 9,
    maxQuantityPerProduct: 9,
  });
  const productC = validateProductQuantityLimit({
    currentQuantity: 0,
    requestedQuantity: 9,
    maxQuantityPerProduct: 9,
  });

  assert.equal(productA.allowed, true);
  assert.equal(productB.allowed, true);
  assert.equal(productC.allowed, true);
});

test('rejects a single product when its quantity exceeds the per-product max', () => {
  const result = validateProductQuantityLimit({
    currentQuantity: 9,
    requestedQuantity: 2,
    maxQuantityPerProduct: 9,
  });

  assert.equal(result.allowed, false);
  assert.match(result.message, /maximum quantity/i);
});
