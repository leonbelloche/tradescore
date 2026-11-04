// $52,000,000 -> "$52.0M"
export function formatMoney(dollars: number): string {
  const sign = dollars < 0 ? "-" : "";
  return `${sign}$${(Math.abs(dollars) / 1_000_000).toFixed(1)}M`;
}
