export function formatCurrency(amount: number): string {
  return `SAR ${amount.toFixed(2)}`;
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB");
}
