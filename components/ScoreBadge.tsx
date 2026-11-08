import { gradeFor, tierFor } from "@/lib/score";

// 5-step color scale, matching the 5 tiers (Fleeced -> Heist!). `fill` = faint tint inside the circle.
export function scoreTone(score: number) {
  if (score > 79) return { text: "text-score-5", border: "border-score-5", bg: "bg-score-5", fill: "bg-score-5/10", cssVar: "var(--score-5)" };
  if (score > 59) return { text: "text-score-4", border: "border-score-4", bg: "bg-score-4", fill: "bg-score-4/10", cssVar: "var(--score-4)" };
  if (score > 40) return { text: "text-score-3", border: "border-score-3", bg: "bg-score-3", fill: "bg-score-3/10", cssVar: "var(--score-3)" };
  if (score > 20) return { text: "text-score-2", border: "border-score-2", bg: "bg-score-2", fill: "bg-score-2/10", cssVar: "var(--score-2)" };
  return { text: "text-score-1", border: "border-score-1", bg: "bg-score-1", fill: "bg-score-1/10", cssVar: "var(--score-1)" };
}

const SIZES = {
  sm: "h-7 w-7 border-2 text-[12px]",
  md: "h-9 w-9 border-2 text-[15px]",
  lg: "h-12 w-12 border-[2.5px] text-xl",
  xl: "h-[4.5rem] w-[4.5rem] border-[3px] text-[30px]",
};

// Trade Score (1-99) circled in its tier color, like a grade on a corrected paper.
export default function ScoreBadge({ score, size = "sm" }: { score: number; size?: keyof typeof SIZES }) {
  const tone = scoreTone(score);
  return (
    <span
      className={`num inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none tracking-tight ${tone.border} ${tone.text} ${tone.fill} ${SIZES[size]}`}
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
