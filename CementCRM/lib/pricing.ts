// A quotation line priced more than this fraction below the product's
// catalog price requires manager approval before it can be sent.
export const DISCOUNT_APPROVAL_THRESHOLD = 0.1;

export function lineNeedsApproval(catalogPrice: number, quotedPrice: number): boolean {
  if (catalogPrice <= 0) return false;
  return quotedPrice < catalogPrice * (1 - DISCOUNT_APPROVAL_THRESHOLD);
}

export interface ComparableLine {
  product_id: string | null;
  quantity: number;
  unit_price: number;
}

// True if two line-item sets are identical regardless of order -- used to
// skip re-approval when a regenerated quotation matches one already approved.
export function itemSetsMatch(a: ComparableLine[], b: ComparableLine[]): boolean {
  if (a.length !== b.length) return false;
  const key = (l: ComparableLine) => `${l.product_id}:${l.quantity}:${l.unit_price}`;
  const sortedA = a.map(key).sort();
  const sortedB = b.map(key).sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}
