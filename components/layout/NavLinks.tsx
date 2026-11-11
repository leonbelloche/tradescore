"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavTeam = { slug: string; name: string; abbreviation: string; logo_url: string | null; conference: "East" | "West" };

// The essentials, always visible. The rest sits under "More" on wide screens (inline on phones, where the bar scrolls).
const LINKS = [
  { href: "/", label: "Trades" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/trade", label: "Build a trade" },
  { href: "/method", label: "How it works" },
];
const MORE = [
  { href: "/block", label: "Trade Block", hint: "Every team's best move, by our engine" },
  { href: "/games", label: "Games", hint: "Tonight's games and last night's results" },
  { href: "/news", label: "News", hint: "Trade ideas of the day and trade talk" },
  { href: "/rankings", label: "Rankings", hint: "Who trades best" },
];

// "/trade" is the builder; "/trade/<id>" pages belong to "Trades".
const isActive = (href: string, path: string | null) => {
  if (path === null) return false;
  if (href === "/") return path === "/" || path.startsWith("/trade/");
  if (href === "/trade") return path === "/trade";
  // "/teams" also covers "/team/<slug>", "/players" covers "/player/<slug>".
  return path.startsWith(href) || path.startsWith(`${href.slice(0, -1)}/`);
};

// The nav itself; `path` = current URL, or null while it is not known yet (no tab highlighted).
// Hovering "Teams" (or focusing it with the keyboard) opens a panel with all 30 teams, East and West.
export function NavLinksView({ path, teams = [] }: { path: string | null; teams?: NavTeam[] }) {
  // The open menu remembers the page it was opened on, so it closes by itself when the page changes.
  const [openOn, setOpenOn] = useState<{ menu: "teams" | "more"; path: string | null } | false>(false);
  const openMenu = openOn && openOn.path === path ? openOn.menu : null;
  const open = openMenu === "teams";
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMenu = (menu: "teams" | "more") => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (menu === "teams" && !teams.length) return;
    setOpenOn({ menu, path });
  };
  const show = () => showMenu("teams");
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenOn(false), 150); // small delay so the mouse can travel to the panel
  };
  const moreActive = MORE.some((m) => isActive(m.href, path));
  // Where the "More" panel opens: right under its button.
  const moreItem = useRef<HTMLLIElement>(null);
  const [moreLeft, setMoreLeft] = useState(0);
  const showMore = () => {
    setMoreLeft(moreItem.current?.offsetLeft ?? 0);
    showMenu("more");
  };
  // Close with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {LINKS.map((l) => {
          const active = isActive(l.href, path);
          const isTeams = l.href === "/teams";
          return (
            <li key={l.href} onMouseEnter={isTeams ? show : undefined} onMouseLeave={isTeams ? hide : undefined}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                aria-expanded={isTeams && teams.length ? open : undefined}
                onFocus={isTeams ? show : undefined}
                className={`display flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${
                  active || (isTeams && open) ? "border-pen text-foreground" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {l.label}
                {isTeams && teams.length > 0 && <span className="ml-1 text-[10px]" aria-hidden>▾</span>}
              </Link>
            </li>
          );
        })}
        {/* Phones: the extra pages inline (the bar scrolls). Wide screens: one "More" menu. */}
        {MORE.map((l) => (
          <li key={l.href} className="md:hidden">
            <Link
              href={l.href}
              aria-current={isActive(l.href, path) ? "page" : undefined}
              className={`display flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${isActive(l.href, path) ? "border-pen text-foreground" : "border-transparent text-muted"}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
        <li ref={moreItem} className="hidden md:block" onMouseEnter={showMore} onMouseLeave={hide}>
          <button
            type="button"
            aria-expanded={openMenu === "more"}
            onClick={() => (openMenu === "more" ? setOpenOn(false) : showMore())}
            onFocus={showMore}
            className={`display flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${
              moreActive || openMenu === "more" ? "border-pen text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            More<span className="ml-1 text-[10px]" aria-hidden>▾</span>
          </button>
        </li>
      </ul>

      {openMenu === "more" && (
        <div
          onMouseEnter={() => showMenu("more")}
          onMouseLeave={hide}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && hide()}
          className="absolute left-0 top-full z-50 hidden w-80 rounded-b-2xl border border-t-0 border-border-strong bg-surface p-2 shadow-2xl shadow-black/60 md:block"
          style={{ left: moreLeft }}
        >
          {MORE.map((m) => (
            <Link key={m.href} href={m.href} className="block rounded-lg px-3 py-2 hover:bg-surface-2">
              <span className={`display block text-sm font-bold ${isActive(m.href, path) ? "text-accent" : ""}`}>{m.label}</span>
              <span className="block text-xs text-muted">{m.hint}</span>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && hide()}
          className="absolute inset-x-0 top-full z-50 hidden rounded-b-2xl border border-t-0 border-border-strong bg-surface p-4 shadow-2xl shadow-black/60 md:block"
        >
          <div className="grid grid-cols-2 gap-6">
            {(["East", "West"] as const).map((c) => (
              <div key={c}>
                <p className="display mb-2 text-xs font-bold text-accent">{c}</p>
                <ul className="grid grid-cols-3 gap-1">
                  {teams
                    .filter((t) => t.conference === c)
                    .map((t) => (
                      <li key={t.slug}>
                        <Link href={`/team/${t.slug}`} className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-2 hover:text-accent">
                          {t.logo_url ? (
                            <Image src={t.logo_url} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
                          ) : (
                            <span className="num w-6 text-[10px]">{t.abbreviation}</span>
                          )}
                          <span className="truncate font-semibold">{t.name}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          <Link href="/teams" className="display mt-3 block border-t border-border pt-3 text-center text-sm font-bold text-accent hover:underline">
            Standings, Trade Score and Roster Score of every team ▸
          </Link>
        </div>
      )}
    </div>
  );
}

// Main navigation; the current page is underlined with the red pen. Render inside <Suspense>.
export default function NavLinks({ teams }: { teams: NavTeam[] }) {
  return <NavLinksView path={usePathname()} teams={teams} />;
}
