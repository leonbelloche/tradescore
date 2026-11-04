import Link from "next/link";
import { getTeams } from "@/lib/db/teams";

// Grid of all teams, each linking to its team page.
export default async function TeamList() {
  const teams = await getTeams();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {teams.map((t) => (
        <Link
          key={t.id}
          href={`/team/${t.slug}`}
          className="rounded-xl border border-border bg-surface p-3 transition hover:border-accent"
        >
          <p className="text-xs font-black text-accent">{t.abbreviation}</p>
          <p className="text-sm font-semibold">{t.name}</p>
          <p className="text-xs text-muted">
            {t.wins}-{t.losses}
          </p>
        </Link>
      ))}
    </div>
  );
}
