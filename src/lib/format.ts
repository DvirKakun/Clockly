export function formatCurrency(n: number): string {
  // Guard against NaN/Infinity (e.g. from a workplace saved without a rate) rendering as "₪NaN".
  if (!Number.isFinite(n)) return '₪0';
  return `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}
