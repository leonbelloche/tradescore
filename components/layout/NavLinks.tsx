"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Trades" },
  { href: "/trade", label: "Build a trade" },
  { href: "/rankings", label: "Rankings" },
  { href: "/method", label: "How it works" },
];

const isActive = (href: string, path: string | null) =>
  path !== null && (href === "/" ? path === "/" || path.startsWith("/trade/") : path.startsWith(href));

// The nav itself; `path` = current URL, or null while it is not known yet (no tab highlighted).
export function NavLinksView({ path }: { path: string | null }) {
  return (
    <ul className="flex items-center gap-1 overflow-x-auto">
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
