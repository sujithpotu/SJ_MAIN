interface QuotationData {
  accountName: string;
  accountLocation: string | null;
  accountContact: string | null;
  accountPhone: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  expectedOrderDate: string | null;
}

export function buildQuotationHtml(data: QuotationData): string {
  const total = data.quantity * data.unitPrice;
  const today = new Date().toLocaleDateString();

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px; color: #0f172a; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .muted { color: #64748b; font-size: 13px; margin-bottom: 24px; }
          .section { margin-bottom: 24px; }
          .label { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
          .value { font-size: 15px; margin-top: 2px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 14px; }
          th { background: #f1f5f9; }
          .total-row td { font-weight: bold; background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>CementCRM Quotation</h1>
        <div class="muted">Generated ${today}</div>

        <div class="section">
          <div class="label">Bill to</div>
          <div class="value" style="font-weight:600">${data.accountName}</div>
          ${data.accountLocation ? `<div class="value">${data.accountLocation}</div>` : ''}
          ${data.accountContact ? `<div class="value">Contact: ${data.accountContact}</div>` : ''}
          ${data.accountPhone ? `<div class="value">Phone: ${data.accountPhone}</div>` : ''}
          ${data.expectedOrderDate ? `<div class="value">Expected order date: ${data.expectedOrderDate}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${data.productName}</td>
              <td>${data.quantity}</td>
              <td>₹${data.unitPrice.toFixed(2)}</td>
              <td>₹${total.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">Grand total</td>
              <td>₹${total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}
