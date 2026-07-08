// A quotation line priced more than this fraction below the product's
// catalog price requires manager approval before it can be sent.
export const DISCOUNT_APPROVAL_THRESHOLD = 0.1;

export function lineNeedsApproval(catalogPrice: number, quotedPrice: number): boolean {
  if (catalogPrice <= 0) return false;
  return quotedPrice < catalogPrice * (1 - DISCOUNT_APPROVAL_THRESHOLD);
}
