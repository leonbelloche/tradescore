// Colors for a Trade Score: red (lost) -> amber (fair) -> green (won).
export function scoreTone(score: number) {
  if (score >= 60) return { text: "text-emerald-400", border: "border-emerald-400", bg: "bg-emerald-400" };
  if (score > 40) return { text: "text-amber-400", border: "border-amber-400", bg: "bg-amber-400" };
  return { text: "text-red-400", border: "border-red-400", bg: "bg-red-400" };
}

// Trade Score /100 in a colored box.
export default function ScoreBadge({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  const tone = scoreTone(score);
  const box = size === "lg" ? "h-16 w-16 text-3xl" : "h-9 w-9 text-base";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border-2 font-black tabular-nums ${tone.border} ${tone.text} ${box}`}
      aria-label={`Trade Score ${score} out of 100`}
    >
      {score}
    </span>
  );
}
