import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LoadingBlock from "@/components/LoadingBlock";
import ScoreBadge from "@/components/ScoreBadge";
import { formatDay } from "@/components/trades/TradeRow";
import { Badge, Card, TeamMark } from "@/components/ui";
import type { AssetDetail } from "@/lib/score";
import { getScoredTrades } from "@/lib/trades/scored";

// Human labels for the calculation steps returned by scoreTrade (breakdown keys).
const STEP_LABEL: Record<string, string> = {
  gameScore: "Game Score (blended)",
  availability: "Availability",
  talentNow: "Talent this season",
  seasons: "Contract seasons counted",
  base: "Base pick value",
  yearsUntilDraft: "Years until the draft",
  discount: "Time discount",
  avgContext: "Team context (average)",
  protection: "Protection",
  value: "Net value",
};

const pctOfCap = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}% of cap`;

function formatStep(key: string, v: number): string {
  if (key === "gameScore") return v.toFixed(1);
  if (key === "availability") return `${Math.round(v * 100)}%`;
  if (key === "seasons" || key === "yearsUntilDraft") return String(v);
  if (key === "discount" || key === "avgContext" || key === "protection") return `×${v.toFixed(2)}`;
  return pctOfCap(v);
}

const stepLabel = (key: string) => STEP_LABEL[key] ?? key.replace(/^season(\d+)Net$/, "Season $1 (net, discounted)");

export default function MethodTradePage(props: PageProps<"/method/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <MethodTrade params={props.params} />
    </Suspense>
  );
}

async function MethodTrade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = (await getScoredTrades()).find((t) => t.id === id);
  if (!trade) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/method" className="display inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-foreground">
        ◂ How it works
      </Link>
      <header className="text-center">
        <p className="display text-sm font-semibold tracking-[0.12em] text-muted">Score breakdown · {formatDay(trade.date)}</p>
        <h1 className="display mt-1 text-3xl font-bold leading-tight sm:text-4xl">
          {trade.teams.map((t) => t.team.short_name ?? t.team.name).join(" · ")}
        </h1>
        <Link href={`/trade/${trade.id}`} className="mt-1 inline-flex min-h-11 items-center text-sm text-accent underline">
          See the trade page
        </Link>
      </header>

      {trade.teams.map(({ team, result }) => (
        <Card key={team.id} className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <TeamMark abbreviation={team.abbreviation} logoUrl={team.logo_url} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="display text-xl font-bold leading-tight">{team.name}</p>
              <p className="flex items-center gap-2 text-sm text-muted">
                <Badge verdict={result.verdict} /> judged as a {result.mode === "middle" ? "middle-of-the-pack" : result.mode} team
              </p>
            </div>
            <ScoreBadge score={result.score} size="lg" />
          </div>

          <AssetTable title="Gets" items={result.received} />
          <AssetTable title="Gives" items={result.sent} />

          <dl className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-3 text-center text-sm">
            <div>
              <dt className="display text-[11px] font-semibold text-muted">Gets</dt>
              <dd className="tabular-nums">{pctOfCap(result.details.receivedTotal)}</dd>
            </div>
            <div>
              <dt className="display text-[11px] font-semibold text-muted">Gives</dt>
              <dd className="tabular-nums">{pctOfCap(result.details.sentTotal)}</dd>
            </div>
            <div>
              <dt className="display text-[11px] font-semibold text-muted">Net</dt>
              <dd className="font-bold tabular-nums">{pctOfCap(result.details.net)}</dd>
            </div>
          </dl>
        </Card>
      ))}

      {trade.warnings.length > 0 && (
        <p className="text-sm text-muted">Data warnings: {trade.warnings.join(" ")}</p>
      )}
    </div>
  );
}

function AssetTable({ title, items }: { title: string; items: AssetDetail[] }) {
  return (
    <div>
      <p className="display mb-1 text-xs font-semibold tracking-[0.08em] text-muted">{title}</p>
      {items.length === 0 && <p className="text-sm text-muted">Nothing counted.</p>}
      <div className="space-y-2">
        {items.map((d, i) => (
          <details key={`${d.asset.id}-${i}`} className="rounded-lg border border-border">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3">
              <span className="display font-semibold">{d.label}</span>
              <span className={`tabular-nums text-sm font-bold ${d.value >= 0 ? "text-score-5" : "text-score-1"}`}>{pctOfCap(d.value)}</span>
            </summary>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {Object.entries(d.breakdown).map(([key, v]) => (
                  <tr key={key}>
                    <td className="px-3 py-1.5 text-muted">{stepLabel(key)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatStep(key, v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </div>
  );
}
