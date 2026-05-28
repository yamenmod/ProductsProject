# PayPal Status Flow Test Scenarios

This project now uses the following backend order statuses for PayPal:

- `PENDING`: PayPal order created, capture not completed yet.
- `SUCCESS`: PayPal capture returned `COMPLETED`.
- `UNSUCCESSFUL`: Capture failed/rejected or non-completed capture status.
- `CANCELLED`: Checkout was explicitly cancelled using the cancel endpoint.

## Backend Log Markers

Watch backend logs for these markers:

- `[paypal:flow] checkout-start`
- `[paypal:flow] paypal-approved`
- `[paypal:flow] capture-called`
- `[paypal:flow] checkout-cancelled`
- `[paypal:flow] final-status-assigned`
- `[paypal:invoice] sending invoice email`
- `[paypal:invoice] invoice email sent`

## Scenario 1: Successful Sandbox Payment

1. Start checkout and approve payment in PayPal sandbox.
2. Let frontend call capture endpoint with the PayPal token.

Expected:

- `orders.status = SUCCESS`
- `payments.status = SUCCESS`
- Invoice logs appear and email is sent.
- Final log contains `finalStatus: SUCCESS`.

## Scenario 2: Close Browser Before Payment

1. Start checkout (create PayPal order).
2. Close browser/tab before approval/capture.

Expected:

- `orders.status = PENDING`
- `payments.status = PENDING`
- No capture logs.
- No invoice logs.

## Scenario 3: Click Cancel on PayPal

Option A (recommended): frontend calls `POST /api/cart/paypal/cancel` with `orderID`.

Expected:

- `orders.status = CANCELLED`
- `payments.status = CANCELLED`
- Logs include `checkout-cancelled` and `finalStatus: CANCELLED`.
- No invoice logs.

Option B (if capture is attempted after cancel):

- Capture should fail and backend marks `UNSUCCESSFUL`.

## Scenario 4: Force Failure in Sandbox

1. Start checkout and use a sandbox flow that fails capture (decline/error).
2. Capture endpoint receives PayPal error.

Expected:

- `orders.status = UNSUCCESSFUL`
- `payments.status = UNSUCCESSFUL`
- Logs show capture failure path and `finalStatus: UNSUCCESSFUL`.
- No invoice logs.

## SQL Checks

Use these sample checks after each test:

```sql
SELECT id, user_id, total, status, created_at
FROM orders
ORDER BY id DESC
LIMIT 10;
```

```sql
SELECT id, order_id, paypal_order_id, status, amount, currency, created_at
FROM payments
ORDER BY id DESC
LIMIT 10;
```
