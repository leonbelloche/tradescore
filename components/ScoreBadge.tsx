import { tierFor } from "@/lib/score";

// 5-step color scale, matching the 5 tiers (Fleeced -> Heist!).
export function scoreTone(score: number) {
  if (score > 79) return { text: "text-score-5", border: "border-score-5", bg: "bg-score-5" };
  if (score > 59) return { text: "text-score-4", border: "border-score-4", bg: "bg-score-4" };
  if (score > 40) return { text: "text-score-3", border: "border-score-3", bg: "bg-score-3" };
  if (score > 20) return { text: "text-score-2", border: "border-score-2", bg: "bg-score-2" };
  return { text: "text-score-1", border: "border-score-1", bg: "bg-score-1" };
}

const SIZES = {
  sm: "h-6 w-6 rounded-[5px] border text-xs",
  md: "h-9 w-9 rounded-md border-[1.5px] text-base",
  lg: "h-12 w-12 rounded-lg border-2 text-2xl",
  xl: "h-16 w-16 rounded-xl border-2 text-4xl",
};

// Trade Score /100 in an outlined box.
export default function ScoreBadge({ score, size = "sm" }: { score: number; size?: keyof typeof SIZES }) {
  const tone = scoreTone(score);
  return (
    <span
      className={`display inline-flex shrink-0 items-center justify-center font-bold tabular-nums leading-none ${tone.border} ${tone.text} ${SIZES[size]}`}
      aria-label={`Trade Score ${score} out of 100`}
    >
      {score}
    </span>
  );
}

// Tier name in its color, e.g. "Heist!".
export function TierLabel({ score, className = "" }: { score: number; className?: string }) {
  return <span className={`display font-semibold normal-case ${scoreTone(score).text} ${className}`}>{tierFor(score)}</span>;
}
