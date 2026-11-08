import { gradeFor, tierFor } from "@/lib/score";

// 5-step color scale, matching the 5 tiers (Fleeced -> Heist!). `cssVar` feeds the tile's glow.
export function scoreTone(score: number) {
  if (score > 79) return { text: "text-score-5", border: "border-score-5", bg: "bg-score-5", cssVar: "var(--score-5)" };
  if (score > 59) return { text: "text-score-4", border: "border-score-4", bg: "bg-score-4", cssVar: "var(--score-4)" };
  if (score > 40) return { text: "text-score-3", border: "border-score-3", bg: "bg-score-3", cssVar: "var(--score-3)" };
  if (score > 20) return { text: "text-score-2", border: "border-score-2", bg: "bg-score-2", cssVar: "var(--score-2)" };
  return { text: "text-score-1", border: "border-score-1", bg: "bg-score-1", cssVar: "var(--score-1)" };
}

const SIZES = {
  sm: "h-6 min-w-7 rounded text-[15px]",
  md: "h-8 min-w-9 rounded-md text-xl",
  lg: "h-11 min-w-12 rounded-md text-[28px]",
  xl: "h-16 min-w-[4.5rem] rounded-lg text-[44px]",
};

// Trade Score (1-99) on a split-flap scoreboard tile in its tier color.
export default function ScoreBadge({ score, size = "sm" }: { score: number; size?: keyof typeof SIZES }) {
  const tone = scoreTone(score);
  return (
    <span
      className={`display score-tile inline-flex shrink-0 items-center justify-center px-1.5 pt-px font-extrabold leading-none tabular-nums tracking-normal text-black ${tone.bg} ${SIZES[size]}`}
      style={{ "--tone": tone.cssVar } as React.CSSProperties}
      aria-label={`Trade Score ${score} out of 100, grade ${gradeFor(score)}`}
    >
      {score}
    </span>
  );
}

// Tier name in its color, e.g. "Heist!".
export function TierLabel({ score, className = "" }: { score: number; className?: string }) {
  return <span className={`display font-extrabold ${scoreTone(score).text} ${className}`}>{tierFor(score)}</span>;
}

// Letter grade in a small outlined box, e.g. "A+".
export function GradeChip({ score, className = "" }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  return (
    <span
      className={`display inline-flex h-6 min-w-7 items-center justify-center rounded border px-1 text-sm font-extrabold leading-none ${tone.border} ${tone.text} ${className}`}
      title="Letter grade"
    >
      {gradeFor(score)}
    </span>
  );
}
