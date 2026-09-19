const test = require('node:test');
const assert = require('node:assert/strict');

const { validateProductQuantityLimit } = require('../utils/cartQuantity');
const { findInactiveCartItems } = require('../controllers/cartController');

test('finds inactive products already in a customer cart', () => {
  const inactiveItems = findInactiveCartItems([
    { id: 1, name: 'Active Board', is_active: 1 },
    { id: 2, name: 'Inactive Board', is_active: 0 },
    { id: 3, name: 'Another Active Board', is_active: 1 },
  ]);

  assert.deepEqual(inactiveItems, [
    { id: 2, name: 'Inactive Board', is_active: 0 },
  ]);
});

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
