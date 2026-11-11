import { Suspense } from "react";
import Logo from "@/components/layout/Logo";
import NavLinks, { NavLinksView, type NavTeam } from "@/components/layout/NavLinks";
import Ticker from "@/components/layout/Ticker";
import UserBadge from "@/components/layout/UserBadge";
import { getTeams } from "@/lib/db/teams";
import { conferenceOf } from "@/lib/nba/conferences";

// The public site's frame: results ticker, logo, main nav, footer. The admin has its own frame (app/admin/layout.tsx).
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="sticky top-0 z-40">
        <Suspense fallback={<div className="h-8 border-b border-border bg-black" />}>
          <Ticker />
        </Suspense>
        <header className="border-b border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-3 pt-2 sm:px-6">
            <Logo tagline />
            <UserBadge />
          </div>
          <nav className="mx-auto max-w-[1280px] px-1 sm:px-4" aria-label="Main">
            <Suspense fallback={<NavLinksView path={null} />}>
              <MainNav />
            </Suspense>
          </nav>
        </header>
      </div>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 pb-10 pt-6 sm:px-6">{children}</main>

      <footer className="border-t border-border bg-surface px-4 py-8 text-center text-xs text-muted">
        <div className="mb-2 flex justify-center">
          <Logo size="sm" />
        </div>
        Stats via ESPN · Not affiliated with the NBA or its teams.
      </footer>
    </>
  );
}

// The nav with the 30 teams for the "Teams" menu (the menu just stays empty if the database is down).
async function MainNav() {
  const teams = await getTeams().catch(() => []);
  const list: NavTeam[] = teams
    .map((t) => ({ slug: t.slug, name: t.name, abbreviation: t.abbreviation, logo_url: t.logo_url, conference: conferenceOf(t.abbreviation) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return <NavLinks teams={list} />;
}
