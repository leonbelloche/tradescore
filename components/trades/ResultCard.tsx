import Link from "next/link";
import ScoreBadge, { TierLabel, scoreTone } from "@/components/ScoreBadge";
import { Badge, Card, TeamMark } from "@/components/ui";
import type { TeamResult } from "@/lib/score";

const MODE_LABEL = { contender: "Contender", middle: "Middle of the pack", rebuild: "Rebuilding" } as const;

export type ResultTeam = {
  name: string;
  abbreviation: string;
  logoUrl?: string | null;
  href?: string; // team page
  record?: string; // "7-1"
};

// One team's Trade Score: big score, verdict written in words, tier, 0-100 bar, what it gets.
// Displays only what scoreTrade returned — no calculation here.
export default function ResultCard({ team, result, showSent = false }: { team: ResultTeam; result: TeamResult; showSent?: boolean }) {
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <TeamMark abbreviation={team.abbreviation} logoUrl={team.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          {team.href ? (
            <Link href={team.href} className="display block text-xl font-bold leading-tight hover:text-accent sm:text-2xl">
              {team.name}
            </Link>
          ) : (
            <p className="display text-xl font-bold leading-tight sm:text-2xl">{team.name}</p>
          )}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Badge verdict={result.verdict} />
            <TierLabel score={result.score} className="text-base" />
            <span className="text-muted">
              · {MODE_LABEL[result.mode]}
              {team.record ? ` (${team.record})` : ""}
            </span>
          </p>
        </div>
        <ScoreBadge score={result.score} size="xl" />
      </div>

      {/* 0-100 bar with the 50 mark */}
      <div className="relative h-1.5 rounded-full bg-background" aria-hidden>
        <div className={`h-1.5 rounded-full ${scoreTone(result.score).bg}`} style={{ width: `${result.score}%` }} />
        <div className="absolute -inset-y-1 left-1/2 w-px bg-muted/70" />
      </div>

      <AssetList title="Gets" items={result.received.map((d) => d.label)} empty="Nothing counted: cash, or a player who is no longer in the NBA." />
      {showSent && <AssetList title="Sends" items={result.sent.map((d) => d.label)} empty="Nothing." />}
    </Card>
  );
}

function AssetList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="display text-xs font-semibold tracking-[0.08em] text-muted">{title}</p>
      {items.length ? (
        <ul className="mt-1 space-y-0.5">
          {items.map((name, i) => (
            <li key={`${name}-${i}`} className="display text-lg font-semibold">
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

// Invalid trade: the reasons, written out, and no score.
export function TradeErrors({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-[14px] border border-score-1/40 bg-score-1/10 p-4 text-sm" role="alert">
      <p className="display mb-2 font-bold text-score-1">Trade not allowed — no score</p>
      <ul className="list-disc space-y-1 pl-5">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
