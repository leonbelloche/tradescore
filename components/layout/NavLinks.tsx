"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Trades" },
  { href: "/games", label: "Games" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
  { href: "/rankings", label: "Rankings" },
  { href: "/compare", label: "H2H" },
  { href: "/trade", label: "Build a trade" },
  { href: "/method", label: "How it works" },
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
export function NavLinksView({ path }: { path: string | null }) {
  return (
    <ul className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
      {LINKS.map((l) => {
        const active = isActive(l.href, path);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`display flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-bold ${
                active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Main navigation; the current page is underlined in amber. Render inside <Suspense>.
export default function NavLinks() {
  return <NavLinksView path={usePathname()} />;
}
