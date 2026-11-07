import type { Verdict } from "@/lib/score";

// Verdict badge. The word (WIN / LOSS / EVEN) is always written: color is never the only signal.
const STYLES: Record<Verdict, string> = {
  Win: "border-score-5 text-score-5",
  Loss: "border-score-1 text-score-1",
  Even: "border-muted text-muted",
};

export default function Badge({ verdict, className = "" }: { verdict: Verdict; className?: string }) {
  return (
    <span className={`display inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-bold tracking-[0.08em] ${STYLES[verdict]} ${className}`}>
      {verdict.toUpperCase()}
    </span>
  );
}
