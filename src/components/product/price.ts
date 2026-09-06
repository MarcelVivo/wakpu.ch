export function formatPrice(cents: number): string {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

export function isVariantAvailable(variant: { active: boolean; stock_mode: string }): boolean {
  return variant.active && !["out_of_stock", "unavailable", "sold_out"].includes(variant.stock_mode);
}
