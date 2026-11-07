import type { TeamMode } from "@/lib/score";

// How a team is judged: its context (CLAUDE.md, "Contexte de l'équipe qui REÇOIT").
export const MODE_INFO: Record<TeamMode, { label: string; hint: string; className: string }> = {
  contender: { label: "Win-now", hint: "Wins 60%+ of its games: this season counts the most", className: "border-accent/60 text-accent" },
  middle: { label: "In the mix", hint: "Between 40% and 60% wins: every season counts the same", className: "border-score-3/50 text-score-3" },
  rebuild: { label: "Rebuilding", hint: "Wins 40% or less: the future counts more than this season", className: "border-violet-400/60 text-violet-300" },
};

// Small pill: WIN-NOW / IN THE MIX / REBUILDING (hover or long-press shows why).
export default function ModeBadge({ mode, className = "" }: { mode: TeamMode; className?: string }) {
  const info = MODE_INFO[mode];
  return (
    <span title={info.hint} className={`display inline-flex items-center rounded-full border px-2 py-px text-[11px] font-bold ${info.className} ${className}`}>
      {info.label}
    </span>
  );
}
