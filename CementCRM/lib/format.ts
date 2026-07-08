export function formatCurrency(amount: number): string {
  return `SAR ${amount.toFixed(2)}`;
}

// Explicit locale so this never follows the device's regional calendar
// (e.g. Hijri on Saudi-region devices) -- business dates stay Gregorian.
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-GB');
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('en-GB');
}
