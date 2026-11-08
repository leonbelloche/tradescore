import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import { DeleteTradeButton, TradeForm } from "@/components/admin/forms";
import LoadingBlock from "@/components/LoadingBlock";
import ScoreBadge from "@/components/ScoreBadge";
import { Card, SectionTitle, TeamMark } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { getTeams } from "@/lib/db/teams";
import { detectedTrades } from "@/lib/admin/detected";
import { getValuedPlayers } from "@/lib/players/values";
import { getScoredTrades } from "@/lib/trades/scored";

export const metadata: Metadata = { title: "Trades — Admin", robots: { index: false } };

export default function AdminTradesPage(props: PageProps<"/admin/trades">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Trades searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Trades({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [trades, teams, { players }] = await Promise.all([getScoredTrades(), getTeams(), getValuedPlayers()]);
  const detected = await detectedTrades(trades.map((t) => t.source ?? ""));
  const prefill = typeof sp.source === "string" ? { date: typeof sp.date === "string" ? sp.date : "", source: sp.source } : undefined;

  return (
    <div className="space-y-10">
      <AdminHeader title="Trades" sub={`${trades.length} trades on the site. New ones are graded instantly.`} />

      <section>
        <SectionTitle title="Spotted on ESPN, not on the site yet" sub={`${detected.length} line${detected.length === 1 ? "" : "s"}, last 30 days`} />
        {detected.length ? (
          <Card className="divide-y divide-border">
            {detected.map((t) => (
              <div key={`${t.date}-${t.description}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="num w-24 shrink-0 text-xs text-muted">{t.date.slice(0, 10)}</span>
                <span className="display w-10 shrink-0 text-sm font-bold">{t.abbreviation}</span>
                <span className="min-w-0 flex-1 text-sm">{t.description}</span>
                <Link
                  href={`/admin/trades?${new URLSearchParams({ date: t.date.slice(0, 10), source: `${t.abbreviation}: ${t.description}` })}#add`}
                  className="display shrink-0 text-sm font-bold text-accent hover:underline"
                >
                  Add it ▸
                </Link>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-4 text-sm text-muted">Nothing new: every trade ESPN reported in the last 30 days is on the site.</Card>
        )}
        <p className="mt-2 text-xs text-muted">ESPN often lists the same trade once per team: add it once, with all the players and picks.</p>
      </section>

      <section id="add">
        <SectionTitle title="Add a trade" />
        <Card className="p-4">
          <TradeForm
            key={prefill?.source ?? "empty"}
            teams={teams.map((t) => ({ abbreviation: t.abbreviation, name: t.name }))}
            players={players.map((p) => ({ name: p.name, team: p.team.abbreviation }))}
            prefill={prefill}
          />
        </Card>
      </section>

      <section>
        <SectionTitle title="On the site" />
        <Card className="divide-y divide-border">
          {trades.map((t) => {
            const label = t.teams.map((x) => x.team.short_name ?? x.team.name).join(" · ");
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="num w-24 shrink-0 text-xs text-muted">{t.date}</span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  {t.teams.map((x) => (
                    <span key={x.team.id} className="inline-flex items-center gap-1.5">
                      <TeamMark abbreviation={x.team.abbreviation} logoUrl={x.team.logo_url} />
                      <ScoreBadge score={x.score} />
                    </span>
                  ))}
                  <Link href={`/trade/${t.id}`} className="min-w-0 truncate text-sm hover:text-accent">
                    {t.teams.map((x) => x.receives.join(", ")).join(" ⇄ ")}
                  </Link>
                </span>
                {t.warnings.length > 0 && (
                  <span className="w-full text-xs text-score-3 sm:order-last">⚠ {t.warnings.join(" ")}</span>
                )}
                <DeleteTradeButton slug={t.id} label={`${t.date} ${label}`} />
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
