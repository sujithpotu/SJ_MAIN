import { formatDate } from './format';
import { LOGO_BASE64_WEBP } from './logoBase64';

interface DispatchLine {
  productName: string;
  quantity: number;
}

interface DispatchNoteData {
  accountName: string;
  accountLocation: string | null;
  accountContact: string | null;
  accountPhone: string | null;
  deliveryAddress: string | null;
  deliveryDate: string | null;
  vehicleInfo: string | null;
  driverInfo: string | null;
  items: DispatchLine[];
}

export function buildDispatchNoteHtml(data: DispatchNoteData): string {
  const today = formatDate(new Date());

  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
        </tr>
      `
    )
    .join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px; color: #0f172a; }
          .header { display: flex; align-items: center; margin-bottom: 24px; }
          .logo { height: 48px; margin-right: 16px; }
          h1 { font-size: 20px; margin: 0; }
          .muted { color: #64748b; font-size: 13px; margin-bottom: 24px; }
          .grid { display: flex; gap: 32px; margin-bottom: 24px; }
          .section { flex: 1; }
          .label { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
          .value { font-size: 15px; margin-top: 2px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 14px; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <img class="logo" src="data:image/webp;base64,${LOGO_BASE64_WEBP}" />
          <h1>Dispatch Note</h1>
        </div>
        <div class="muted">Generated ${today}</div>

        <div class="grid">
          <div class="section">
            <div class="label">Deliver to</div>
            <div class="value" style="font-weight:600">${data.accountName}</div>
            ${data.accountContact ? `<div class="value">Contact: ${data.accountContact}</div>` : ''}
            ${data.accountPhone ? `<div class="value">Phone: ${data.accountPhone}</div>` : ''}
            ${data.deliveryAddress ? `<div class="value">${data.deliveryAddress}</div>` : ''}
          </div>
          <div class="section">
            <div class="label">Delivery details</div>
            ${data.deliveryDate ? `<div class="value">Date: ${formatDate(data.deliveryDate)}</div>` : ''}
            ${data.vehicleInfo ? `<div class="value">Vehicle: ${data.vehicleInfo}</div>` : ''}
            ${data.driverInfo ? `<div class="value">Driver: ${data.driverInfo}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;
}
