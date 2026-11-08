import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { SectionTitle, TeamMark } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { conferenceOf, standings, type Conference } from "@/lib/nba/conferences";
import { getValuedPlayers, teamMode } from "@/lib/players/values";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

export const metadata: Metadata = {
  title: "Teams — Trade Score",
  description: "All 30 NBA teams: record, payroll, trade grades and their most valuable player.",
};

export default function TeamsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">2026-27 season</p>
        <h1 className="display text-4xl font-extrabold leading-[0.9] sm:text-5xl">Teams</h1>
        <p className="max-w-xl text-muted">All 30 teams: how they trade, what they spend, and who they could trade away.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Teams />
      </Suspense>
    </div>
  );
}

async function Teams() {
  const [{ league, teams, players }, trades] = await Promise.all([getValuedPlayers(), getScoredTrades()]);
  const stats = new Map(teamStats(trades).map((s) => [s.team.id, s]));
  const topPlayer = new Map<string, (typeof players)[number]>();
  for (const p of players) if (!topPlayer.has(p.team.id)) topPlayer.set(p.team.id, p); // players are sorted best first

  return (
    <>
      {(["East", "West"] as Conference[]).map((c, i) => (
        <section key={c}>
          <SectionTitle index={i + 1} title={`${c}ern Conference`} sub="by record" />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {standings(teams.filter((t) => conferenceOf(t.abbreviation) === c)).map((t, rank) => {
              const s = stats.get(t.id);
              const star = topPlayer.get(t.id);
              const over = t.payroll > league.salary_cap;
              return (
                <li key={t.id} className="min-w-0">
                  <Link href={`/team/${t.slug}`} className="block h-full rounded-[14px] border border-border bg-surface p-4 transition hover:border-accent/60 hover:bg-surface-2">
                    <div className="flex items-center gap-3">
                      <span className="num w-5 text-xs text-muted">{rank + 1}</span>
                      <TeamMark abbreviation={t.abbreviation} logoUrl={t.logo_url} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="display block truncate text-lg font-extrabold leading-tight">{t.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="num text-xs text-muted">{t.wins}-{t.losses}</span>
                          <ModeBadge mode={teamMode(t)} />
                        </span>
                      </span>
                      {s ? (
                        <span className="text-center" title={`Average Trade Score over ${s.trades} trade(s)`}>
                          <ScoreBadge score={s.average} size="md" />
                          <span className="num block text-[10px] text-muted">{s.trades} trade{s.trades > 1 ? "s" : ""}</span>
                        </span>
                      ) : (
                        <span className="display text-[11px] font-bold text-muted">No trade</span>
                      )}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                      <div>
                        <dt className="display font-bold text-muted">Payroll</dt>
                        <dd className={`num ${over ? "text-score-2" : ""}`}>
                          {formatMoney(t.payroll)} <span className="text-muted">{over ? "over cap" : "under cap"}</span>
                        </dd>
                      </div>
                      {star && (
                        <div className="min-w-0">
                          <dt className="display font-bold text-muted">Top value</dt>
                          <dd className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{star.name}</span>
                            <ScoreBadge score={star.score} />
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
