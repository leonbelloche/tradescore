// Trade Score /100 in a colored box: red (lost) -> amber (fair) -> green (won).
export default function ScoreBadge({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  const color =
    score >= 60
      ? "border-emerald-400 text-emerald-400"
      : score > 40
        ? "border-amber-400 text-amber-400"
        : "border-red-400 text-red-400";
  const box = size === "lg" ? "h-16 w-16 text-3xl" : "h-9 w-9 text-base";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border-2 font-black tabular-nums ${color} ${box}`}
      aria-label={`Trade Score ${score} out of 100`}
    >
      {score}
    </span>
  );
}
