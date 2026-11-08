import { GRADES, SCORE_RANGE, TIERS } from "@/lib/score";
import ScoreBadge, { scoreTone } from "./ScoreBadge";

// What each tier means, in plain English (same order as TIERS: worst -> best).
const MEANING: Record<string, string> = {
  Fleeced: "Robbed. Gave away far more value than they got back.",
  "Lost It": "Lost the trade: paid more than they received.",
  "Fair Deal": "Even-ish: both sides get about what they give.",
  "Won It": "Won the trade: clearly more value coming in.",
  "Heist!": "A steal. Huge value for very little in return.",
};

// The 5 tiers with their score range, letter grades and meaning: the Trade Score "grading scale".
function bands() {
  let min: number = SCORE_RANGE.min;
  return TIERS.map((t) => {
    const band = {
      label: t.label,
      min,
      max: t.max as number,
      grades: GRADES.filter((g) => g.max >= min && g.max <= t.max).map((g) => g.grade).reverse().join(" / "),
      sample: Math.round((min + t.max) / 2),
    };
    min = t.max + 1;
    return band;
  });
}

// `compact` = one colored strip (for result pages); full = a card per tier (home, method, players).
export default function ScoreScale({ compact = false, title = "How to read a Trade Score" }: { compact?: boolean; title?: string }) {
  const list = bands();
  if (compact) {
    return (
      <div aria-label="Trade Score scale">
        <div className="flex overflow-hidden rounded-md">
          {list.map((b) => (
            <div key={b.label} className={`${scoreTone(b.sample).bg} flex-1 py-1 text-center text-black`} title={MEANING[b.label]}>
              <span className="display block text-[11px] font-extrabold leading-tight sm:text-xs">{b.label}</span>
            </div>
          ))}
        </div>
        <div className="num mt-1 flex text-[10px] text-muted">
          {list.map((b) => (
            <span key={b.label} className="flex-1 text-center">{b.min}-{b.max}</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <section aria-labelledby="score-scale-title">
      <h2 id="score-scale-title" className="display mb-1 text-xl font-bold sm:text-2xl">{title}</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Every team gets its own score from {SCORE_RANGE.min} to {SCORE_RANGE.max}. 50 means it got exactly what it gave. Nobody gets 100: no trade is perfect.
      </p>
      <ol className="grid gap-2 sm:grid-cols-5">
        {[...list].reverse().map((b) => (
          <li key={b.label} className={`rounded-[14px] border border-border border-t-4 bg-surface p-3 ${scoreTone(b.sample).border}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`display text-lg font-extrabold ${scoreTone(b.sample).text}`}>{b.label}</span>
              <ScoreBadge score={b.sample} />
            </div>
            <p className="num mt-1 text-xs text-foreground">
              {b.min}-{b.max} <span className="text-muted">· grade {b.grades}</span>
            </p>
            <p className="mt-1.5 text-xs leading-snug text-muted">{MEANING[b.label]}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
