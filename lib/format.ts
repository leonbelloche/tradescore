// $52,000,000 -> "$52.0M" · $250,000 -> "$250K" · $0 -> "$0"
export function formatMoney(dollars: number): string {
  const sign = dollars < 0 ? "-" : "";
  const abs = Math.abs(dollars);
  if (abs === 0) return "$0";
  if (abs < 1_000_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
}
