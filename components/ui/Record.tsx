// A team's season record (wins-losses). "inline" = small "8-2" next to a name; "lg" = scoreboard block.
export default function Record({ wins, losses, size = "inline", className = "" }: { wins: number; losses: number; size?: "inline" | "lg"; className?: string }) {
  const label = `${wins} wins, ${losses} losses`;
  if (size === "lg") {
    const pct = wins + losses ? (wins / (wins + losses)).toFixed(3).replace(/^0/, "") : ".000";
    return (
      <span className={`led inline-flex items-end gap-3 rounded-lg border border-border bg-background px-3 py-1.5 ${className}`} aria-label={label}>
        <span className="text-center">
          <span className="display block text-2xl font-extrabold leading-none tabular-nums text-score-5">{wins}</span>
          <span className="display block text-[10px] font-bold text-muted">W</span>
        </span>
        <span className="text-center">
          <span className="display block text-2xl font-extrabold leading-none tabular-nums text-score-1">{losses}</span>
          <span className="display block text-[10px] font-bold text-muted">L</span>
        </span>
        <span className="text-center">
          <span className="display block text-2xl font-extrabold leading-none tabular-nums">{pct}</span>
          <span className="display block text-[10px] font-bold text-muted">Pct</span>
        </span>
      </span>
    );
  }
  return (
    <span className={`num inline-flex items-center rounded border border-border bg-background px-1 text-[11px] leading-4 tabular-nums ${className}`} aria-label={label} title={label}>
      <span className="text-foreground">{wins}</span>
      <span className="text-muted">-</span>
      <span className="text-foreground">{losses}</span>
    </span>
  );
}
