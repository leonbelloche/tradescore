import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import { ContractEditor, field } from "@/components/admin/forms";
import LoadingBlock from "@/components/LoadingBlock";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import { Card, SectionTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import type { RosterPlayer } from "@/lib/db/teams";
import { getValuedPlayers } from "@/lib/players/values";

export const metadata: Metadata = { title: "Contracts — Admin", robots: { index: false } };

export default function AdminContractsPage(props: PageProps<"/admin/contracts">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Contracts searchParams={props.searchParams} />
    </Suspense>
  );
}

const nextSeasons = (current: string, n = 5) =>
  Array.from({ length: n }, (_, i) => {
    const y = Number(current.slice(0, 4)) + i;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });

async function Contracts({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const { league, teams, players } = await getValuedPlayers();
  const seasons = nextSeasons(league.current_season);
  const roster = new Map<string, RosterPlayer>(teams.flatMap((t) => t.roster.map((p) => [p.id, p] as const)));
  const missing = players.filter((p) => !p.hasContract).sort((a, b) => b.gameScore - a.gameScore); // best players first
  const found = q ? players.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 10) : [];

  const row = (p: (typeof players)[number]) => {
    const r = roster.get(p.id);
    const initial = Object.fromEntries((r?.contracts ?? []).map((c) => [c.season, c.salary]));
    const manual = r?.contracts.some((c) => c.source === "manual");
    return (
      <div key={p.id} className="space-y-2 px-4 py-3">
        <Link href={`/player/${p.slug}`} className="flex items-center gap-2.5 hover:text-accent">
          <PlayerAvatar name={p.name} url={p.headshotUrl} />
          <span className="display font-bold">{p.name}</span>
          <span className="num text-xs text-muted">
            {p.team.abbreviation} · {p.position} · {p.age} yrs · GmSc {p.gameScore.toFixed(1)}
          </span>
          {manual && <span className="display rounded bg-surface-2 px-1.5 text-[10px] font-bold text-accent">typed by you</span>}
        </Link>
        <ContractEditor playerId={p.id} seasons={seasons} initial={initial} />
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <AdminHeader title="Contracts" sub="Salaries in millions of dollars (21.5 = $21,500,000). What you type is never overwritten by ESPN." />

      <section>
        <SectionTitle title="Edit any player" />
        <form className="flex max-w-md gap-2">
          <input name="q" defaultValue={q} placeholder="Search a player…" aria-label="Search a player" className={field} />
          <button type="submit" className="display min-h-11 rounded-lg border border-border-strong px-4 text-sm font-bold hover:border-accent">
            Search
          </button>
        </form>
        {q && (
          <Card className="mt-3 divide-y divide-border">
            {found.length ? found.map(row) : <p className="p-4 text-sm text-muted">No player matches “{q}”.</p>}
          </Card>
        )}
      </section>

      <section>
        <SectionTitle title="Missing a contract" sub={`${missing.length} players · best players first (by Game Score)`} />
        {missing.length ? (
          <Card className="divide-y divide-border">{missing.slice(0, 40).map(row)}</Card>
        ) : (
          <Card className="p-4 text-sm text-muted">Every player has a contract. 🎉</Card>
        )}
        {missing.length > 40 && <p className="mt-2 text-xs text-muted">Showing the 40 most important. Fill these and the next ones appear.</p>}
      </section>
    </div>
  );
}
