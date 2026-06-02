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

const formatOrderDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const buildSummaryRows = (items = [], currency = "USD") => {
  if (!items.length) {
    return `
      <tr>
        <td colspan="4" style="padding:18px 12px;color:#64748b;text-align:center;">No item details available.</td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.price ?? item.finalPrice ?? 0) || 0;
      const lineTotal = Number(item.subtotal ?? unitPrice * quantity) || 0;

      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#0f172a;">${escapeHtml(item.name || "Item")}</td>
          <td align="center" style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#334155;">${quantity}</td>
          <td align="right" style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#334155;">${formatMoney(unitPrice, currency)}</td>
          <td align="right" style="padding:14px 12px;border-bottom:1px solid #e5edf5;color:#0f172a;font-weight:700;">${formatMoney(lineTotal, currency)}</td>
        </tr>
      `;
    })
    .join("");
};

const buildOrderEmailHtml = ({
  customerName,
  orderId,
  orderDate,
  paymentStatus,
  transactionId,
  currency = "USD",
  items = [],
  subtotal = 0,
  shipping = 0,
  tax = 0,
  total = 0,
  viewOrderUrl = "#",
}) => {
  const safeName = escapeHtml(customerName || "Surfer");
  const safeOrderId = escapeHtml(orderId ?? "");
  const safeOrderDate = escapeHtml(formatOrderDate(orderDate));
  const safeTransactionId = escapeHtml(transactionId ?? "");
  const statusLabel = escapeHtml(paymentStatus || "Pending");
  const summaryRows = buildSummaryRows(items, currency);

  return `
    <div style="margin:0;padding:0;background:#f7f5f2;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#0b2545;">
      <div style="max-width:680px;margin:0 auto;padding:20px;">
        <div style="background:#ffffff;border:1px solid rgba(3,27,63,0.04);border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(11,37,69,0.06);">
          <div style="padding:24px 22px;background:linear-gradient(90deg,#003087 0%,#0066c0 100%);color:#fff;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;">🌊</div>
              <div>
                <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9;font-weight:700;">Plage Surf</div>
                <div style="font-size:20px;line-height:1.05;font-weight:800;margin-top:2px;">Order Confirmation</div>
              </div>
            </div>
            <div style="margin-top:12px;font-size:13px;line-height:1.6;max-width:520px;opacity:.95;">Thanks for shopping at Plage Surf. Your order is confirmed and we are getting it ready to ship.</div>
          </div>

          <div style="padding:22px;">
            <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin-bottom:18px;">
              <div>
                <div style="font-size:12px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Hello</div>
                <div style="font-size:18px;font-weight:800;color:#06203a;">${safeName}</div>
              </div>
              <div style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:#e6f0ff;color:#003087;font-weight:800;font-size:12px;letter-spacing:.4px;text-transform:uppercase;">
                ${statusLabel}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px;">
              <div style="background:#fbfcfe;border:1px solid rgba(3,27,63,0.04);border-radius:12px;padding:12px;">
                <div style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Order ID</div>
                <div style="font-size:14px;font-weight:800;color:#06203a;word-break:break-word;">${safeOrderId}</div>
              </div>
              <div style="background:#fbfcfe;border:1px solid rgba(3,27,63,0.04);border-radius:12px;padding:12px;">
                <div style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Order Date</div>
                <div style="font-size:14px;font-weight:700;color:#06203a;">${safeOrderDate}</div>
              </div>
              <div style="background:#fbfcfe;border:1px solid rgba(3,27,63,0.04);border-radius:12px;padding:12px;">
                <div style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Transaction</div>
                <div style="font-size:14px;font-weight:700;color:#06203a;word-break:break-word;">${safeTransactionId}</div>
              </div>
              <div style="background:#fbfcfe;border:1px solid rgba(3,27,63,0.04);border-radius:12px;padding:12px;">
                <div style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Status</div>
                <div style="font-size:14px;font-weight:700;color:#06203a;">${statusLabel}</div>
              </div>
            </div>

            <div style="margin-bottom:14px;">
              <div style="font-size:16px;font-weight:800;color:#06203a;margin-bottom:10px;">Order Summary</div>
              <div style="border:1px solid rgba(3,27,63,0.04);border-radius:12px;overflow:hidden;background:#ffffff;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;width:100%;font-size:14px;">
                  <thead>
                    <tr style="background:#f3f6fb;">
                      <th align="left" style="padding:12px;color:#334155;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid rgba(3,27,63,0.03);">Item</th>
                      <th align="center" style="padding:12px;color:#334155;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid rgba(3,27,63,0.03);">Qty</th>
                      <th align="right" style="padding:12px;color:#334155;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid rgba(3,27,63,0.03);">Price</th>
                      <th align="right" style="padding:12px;color:#334155;font-size:12px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid rgba(3,27,63,0.03);">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaryRows}
                  </tbody>
                </table>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;color:#475569;font-size:14px;">
                <span>Subtotal</span>
                <strong style="color:#06203a;">${formatMoney(subtotal, currency)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;color:#475569;font-size:14px;">
                <span>Shipping</span>
                <strong style="color:#06203a;">${formatMoney(shipping, currency)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;color:#475569;font-size:14px;">
                <span>Tax</span>
                <strong style="color:#06203a;">${formatMoney(tax, currency)}</strong>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(3,27,63,0.04);font-size:16px;">
              <span style="font-weight:900;color:#06203a;">Total</span>
              <strong style="font-size:20px;color:#003087;">${formatMoney(total, currency)}</strong>
            </div>

            <div style="text-align:center;margin-top:16px;">
              <a href="${escapeHtml(viewOrderUrl || "#")}" style="display:inline-block;background:#003087;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:10px;">
                View Your Order
              </a>
            </div>
          </div>
        </div>

        <div style="text-align:center;color:#64748b;font-size:12px;line-height:1.5;padding:14px 6px 0;">
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
