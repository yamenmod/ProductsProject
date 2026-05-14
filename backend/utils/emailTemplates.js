const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

const formatOrderDate = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const buildOrderSummaryRows = (items = [], currency = "USD") =>
  items
    .map((item) => {
      const name = escapeHtml(item.name || item.title || "Item");
      const quantity = Number(item.quantity) || 1;
      const price = formatMoney(item.finalPrice ?? item.price ?? item.amount ?? 0, currency);
      const lineTotal = formatMoney(item.subtotal ?? item.total ?? (item.finalPrice ?? item.price ?? 0) * quantity, currency);

      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#0f172a;font-weight:600;">${name}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#475569;text-align:center;">${quantity}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#475569;text-align:right;">${price}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#0f172a;text-align:right;font-weight:700;">${lineTotal}</td>
        </tr>
      `;
    })
    .join("");

const buildOrderEmailHtml = ({
  customerName,
  orderId,
  orderDate,
  paymentStatus,
  transactionId,
  currency,
  items = [],
  subtotal,
  shipping,
  tax,
  total,
  viewOrderUrl,
}) => {
  const safeName = escapeHtml(customerName || "Surfer");
  const safeOrderId = escapeHtml(orderId || "-");
  const safeTransactionId = escapeHtml(transactionId || orderId || "-");
  const safeOrderDate = escapeHtml(formatOrderDate(orderDate));
  const statusLabel = escapeHtml(paymentStatus || "Paid");
  const summaryRows = buildOrderSummaryRows(items, currency);

  return `
    <div style="margin:0;padding:0;background:#f5f9fc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#ffffff 0%,#eef6ff 100%);border:1px solid #dbeafe;border-radius:24px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
          <div style="padding:30px 28px 22px;background:linear-gradient(135deg,#003087 0%,#0070e0 100%);color:#fff;position:relative;">
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;">
                🌊
              </div>
              <div>
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.9;font-weight:700;">Plage Surf</div>
                <div style="font-size:26px;line-height:1.1;font-weight:800;margin-top:4px;">Thank you for your order</div>
              </div>
            </div>
            <div style="margin-top:18px;font-size:14px;line-height:1.6;max-width:520px;opacity:.96;">
              Your order has been confirmed and is now being prepared by the Plage Surf team.
            </div>
          </div>

          <div style="padding:28px;">
            <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin-bottom:22px;">
              <div>
                <div style="font-size:13px;color:#64748b;margin-bottom:6px;">Hello</div>
                <div style="font-size:20px;font-weight:800;color:#0f172a;">${safeName}</div>
              </div>
              <div style="display:inline-flex;align-items:center;padding:8px 14px;border-radius:999px;background:#e7f5ee;color:#166534;font-weight:800;font-size:12px;letter-spacing:.4px;text-transform:uppercase;">
                ${statusLabel}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:22px;">
              <div style="background:#f8fbff;border:1px solid #d9e6f5;border-radius:18px;padding:16px;">
                <div style="font-size:12px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Order ID</div>
                <div style="font-size:15px;font-weight:800;color:#0f172a;word-break:break-word;">${safeOrderId}</div>
              </div>
              <div style="background:#f8fbff;border:1px solid #d9e6f5;border-radius:18px;padding:16px;">
                <div style="font-size:12px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Order Date</div>
                <div style="font-size:15px;font-weight:800;color:#0f172a;">${safeOrderDate}</div>
              </div>
              <div style="background:#f8fbff;border:1px solid #d9e6f5;border-radius:18px;padding:16px;">
                <div style="font-size:12px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Transaction ID</div>
                <div style="font-size:15px;font-weight:800;color:#0f172a;word-break:break-word;">${safeTransactionId}</div>
              </div>
              <div style="background:#f8fbff;border:1px solid #d9e6f5;border-radius:18px;padding:16px;">
                <div style="font-size:12px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Payment Status</div>
                <div style="font-size:15px;font-weight:800;color:#0f172a;">Paid</div>
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:12px;">Order Summary</div>
              <div style="border:1px solid #d9e6f5;border-radius:18px;overflow:hidden;background:#fff;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;width:100%;font-size:14px;">
                  <thead>
                    <tr style="background:#f8fbff;">
                      <th align="left" style="padding:14px 12px;color:#475569;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e5edf5;">Item</th>
                      <th align="center" style="padding:14px 12px;color:#475569;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e5edf5;">Qty</th>
                      <th align="right" style="padding:14px 12px;color:#475569;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e5edf5;">Price</th>
                      <th align="right" style="padding:14px 12px;color:#475569;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e5edf5;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaryRows || `
                      <tr>
                        <td colspan="4" style="padding:18px 12px;color:#64748b;text-align:center;">No item details available.</td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>

            <div style="display:grid;gap:10px;margin-bottom:24px;">
              <div style="display:flex;justify-content:space-between;color:#475569;font-size:14px;">
                <span>Subtotal</span>
                <strong style="color:#0f172a;">${formatMoney(subtotal, currency)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;color:#475569;font-size:14px;">
                <span>Shipping</span>
                <strong style="color:#0f172a;">${formatMoney(shipping, currency)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;color:#475569;font-size:14px;">
                <span>Tax</span>
                <strong style="color:#0f172a;">${formatMoney(tax, currency)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid #d9e6f5;font-size:16px;">
                <span style="font-weight:800;color:#0f172a;">Total</span>
                <strong style="font-size:20px;color:#003087;">${formatMoney(total, currency)}</strong>
              </div>
            </div>

            <div style="text-align:center;margin-top:8px;">
              <a href="${escapeHtml(viewOrderUrl || '#')}" style="display:inline-block;background:linear-gradient(135deg,#003087 0%,#0070e0 100%);color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:999px;box-shadow:0 12px 20px rgba(0,48,135,.18);">
                View Your Order
              </a>
            </div>
          </div>
        </div>

        <div style="text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;padding:18px 6px 0;">
          Plage Surf · Ocean-inspired gear for the ride ahead
        </div>
      </div>
    </div>
  `;
};

module.exports = {
  buildOrderEmailHtml,
  escapeHtml,
  formatMoney,
  formatOrderDate,
};
