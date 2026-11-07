import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LoadingBlock from "@/components/LoadingBlock";
import { TeamMark } from "@/components/ui";
import { getTeamBySlug } from "@/lib/db/teams";
import { formatMoney } from "@/lib/format";

export default function TeamPage(props: PageProps<"/team/[slug]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Team params={props.params} />
    </Suspense>
  );
}

async function Team({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const overCap = team.capSpace < 0;
  const missingSalary = team.roster.filter((p) => p.currentSalary === 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center gap-4">
        <TeamMark abbreviation={team.abbreviation} logoUrl={team.logo_url} size="lg" />
        <div>
          <h1 className="display text-2xl font-bold leading-tight sm:text-3xl">{team.name}</h1>
          <p className="text-sm text-muted">
            {team.wins}-{team.losses} · {team.league.current_season} season
          </p>
        </div>
      </header>

      {/* Payroll summary */}
      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Payroll" value={formatMoney(team.payroll)} />
        <Stat label="Salary cap" value={formatMoney(team.league.salary_cap)} />
        <Stat
          label={overCap ? "Over the cap" : "Cap space"}
          value={formatMoney(Math.abs(team.capSpace))}
          tone={overCap ? "bad" : "good"}
        />
      </section>
      {missingSalary.length > 0 && (
        <p className="rounded-[14px] border border-score-3/40 bg-score-3/10 px-4 py-3 text-sm">
          <span className="display font-semibold text-score-3">Incomplete payroll · </span>
          No contract data yet for {missingSalary.length} player{missingSalary.length > 1 ? "s" : ""}:{" "}
          {missingSalary.map((p) => p.name).join(", ")}. The payroll above leaves them out.
        </p>
      )}

      {/* Roster */}
      <section className="space-y-3">
        <h2 className="display text-2xl font-bold tracking-[0.06em]">Roster</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="display bg-surface text-left text-xs font-semibold tracking-[0.06em] text-muted">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2 text-right">Age</th>
                <th className="px-3 py-2 text-right">Salary</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">Contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {team.roster.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <Link href={`/player/${p.slug}`} className="display text-[15px] font-semibold hover:text-accent">
                      {p.name}
                    </Link>
                    <span className="ml-2 text-xs text-muted">{p.position}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.age}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {p.currentSalary ? formatMoney(p.currentSalary) : "—"}
                    <span className="block text-xs text-muted sm:hidden">
                      {p.yearsLeft} yr{p.yearsLeft > 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums text-muted sm:table-cell">
                    {p.yearsLeft} yr{p.yearsLeft > 1 ? "s" : ""} / {formatMoney(p.totalRemaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Stats and rosters: ESPN. Contracts: ESPN + manual entries.</p>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-score-5" : tone === "bad" ? "text-score-1" : "";
  return (
    <div className="rounded-[14px] border border-border bg-surface p-3 sm:p-4">
      <p className="display text-xs font-semibold tracking-[0.06em] text-muted">{label}</p>
      <p className={`display text-xl font-bold tabular-nums sm:text-3xl ${color}`}>{value}</p>
    </div>
  );
}
