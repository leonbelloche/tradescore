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
  sm: "h-7 min-w-7 rounded-[5px] text-base",
  md: "h-10 min-w-10 rounded-md text-2xl",
  lg: "h-14 min-w-14 rounded-lg text-4xl",
  xl: "h-20 min-w-20 rounded-xl text-6xl",
};

// Trade Score /100 on a solid scoreboard tile (tier color, dark digits, LED-dot texture).
export default function ScoreBadge({ score, size = "sm" }: { score: number; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`display led inline-flex shrink-0 items-center justify-center px-1 font-black leading-none tabular-nums text-black ${scoreTone(score).bg} ${SIZES[size]}`}
      aria-label={`Trade Score ${score} out of 100`}
    >
      {score}
    </span>
  );
}

// Tier name in its color, e.g. "Heist!".
export function TierLabel({ score, className = "" }: { score: number; className?: string }) {
  return <span className={`display font-extrabold ${scoreTone(score).text} ${className}`}>{tierFor(score)}</span>;
}
