import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import ScoreBadge, { TierLabel, scoreTone } from "@/components/ScoreBadge";
import { Badge, Card, TeamMark } from "@/components/ui";
import { reasonsFor, type TeamResult } from "@/lib/score";

export type ResultTeam = {
  name: string;
  abbreviation: string;
  logoUrl?: string | null;
  href?: string; // team page
  record?: string; // "7-1"
};

// One team's Trade Score: score, verdict in words, tier, mode, why, and what it gets.
// Displays only what scoreTrade / reasonsFor returned — no calculation here.
export default function ResultCard({ team, result, showSent = false }: { team: ResultTeam; result: TeamResult; showSent?: boolean }) {
  const reasons = reasonsFor(result);
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <TeamMark abbreviation={team.abbreviation} logoUrl={team.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          {team.href ? (
            <Link href={team.href} className="display block truncate text-lg font-bold leading-tight hover:text-accent">
              {team.name}
            </Link>
          ) : (
            <p className="display truncate text-lg font-bold leading-tight">{team.name}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge verdict={result.verdict} />
            <ModeBadge mode={result.mode} />
            {team.record && <span className="num text-[11px] text-muted">{team.record}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <ScoreBadge score={result.score} size="lg" />
          <TierLabel score={result.score} className="text-xs" />
        </div>
      </div>

      {/* 0-100 bar with the 50 mark */}
      <div className="relative h-1 rounded-full bg-background" aria-hidden>
        <div className={`h-1 rounded-full ${scoreTone(result.score).bg}`} style={{ width: `${result.score}%` }} />
        <div className="absolute -inset-y-1 left-1/2 w-px bg-muted/60" />
      </div>

      <div className="rounded-lg bg-surface-2 p-3">
        <p className="display mb-1 text-xs font-bold text-accent">Why {result.score}?</p>
        <ul className="space-y-1 text-sm leading-snug">
          {reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-muted" aria-hidden>
                ▸
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <AssetList title="Gets" items={result.received.map((d) => d.label)} empty="Nothing counted: cash, or a player who is no longer in the NBA." />
      {showSent && <AssetList title="Sends" items={result.sent.map((d) => d.label)} empty="Nothing." />}
    </Card>
  );
}

function AssetList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="display text-xs font-bold text-muted">{title}</p>
      {items.length ? (
        <p className="mt-0.5 text-sm">{items.join(" · ")}</p>
      ) : (
        <p className="mt-0.5 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

// Invalid trade: the reasons, written out, and no score.
export function TradeErrors({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-xl border border-score-1/40 bg-score-1/10 p-4 text-sm" role="alert">
      <p className="display mb-2 font-bold text-score-1">Trade not allowed — no score</p>
      <ul className="list-disc space-y-1 pl-5">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
