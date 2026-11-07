import { TierLabel, scoreTone } from "@/components/ScoreBadge";
import { TIERS, tierFor } from "@/lib/score";

// Share of team results in each tier, as one segmented bar with labels.
export default function TierBar({ scores, label }: { scores: number[]; label: string }) {
  const tiers = TIERS.map((tier, i) => {
    const min = i === 0 ? 0 : TIERS[i - 1].max + 1;
    const count = scores.filter((s) => tierFor(s) === tier.label).length;
    return { label: tier.label, sample: min, pct: scores.length ? Math.round((count / scores.length) * 100) : 0 };
  }).filter((t) => t.pct > 0);

  return (
    <div>
      <p className="display mb-2 text-sm font-bold text-muted">{label}</p>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded">
        {tiers.map((t) => (
          <div key={t.label} style={{ flex: t.pct }} className={`led ${scoreTone(t.sample).bg}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
        {tiers.map((t) => (
          <span key={t.label} className="whitespace-nowrap">
            <TierLabel score={t.sample} /> <span className="num text-xs text-muted">{t.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
