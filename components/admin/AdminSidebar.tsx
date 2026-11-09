"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";

// Tiny line icons (24x24 viewBox, stroke = currentColor).
const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z" />,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  instagram: <path d="M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5h.01" />,
  video: <path d="M4 6h11v12H4zM15 10l5-3v10l-5-3" />,
  trades: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  contracts: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />,
  calibration: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z" />,
  settings: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" />,
  site: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
};
function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

const GROUPS = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }] },
  {
    title: "Social",
    items: [
      { href: "/admin/x", label: "X", icon: "x" },
      { href: "/admin/instagram", label: "Instagram", icon: "instagram" },
      { href: "/admin/video", label: "Video studio", icon: "video" },
      { href: "/admin/trades", label: "Trades", icon: "trades" },
      { href: "/admin/contracts", label: "Contracts", icon: "contracts" },
    ],
  },
  {
    title: "Model",
    items: [
      { href: "/admin/calibration", label: "Calibration", icon: "calibration" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const isActive = (href: string, path: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

// Left sidebar on desktop, horizontal bar on phones.
export default function AdminSidebar() {
  const path = usePathname();
  const item = "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition";
  return (
    <aside className="border-b border-border bg-surface lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
        <Link href="/admin" className="block leading-none">
          <span className="display pen-underline text-lg font-extrabold lowercase tracking-[-0.04em]">trade score</span>
          <span className="num mt-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Admin panel</span>
        </Link>
        <form action={logout} className="lg:hidden">
          <button type="submit" className="num rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground">
            Log out
          </button>
        </form>
      </div>
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-3 [scrollbar-width:none] lg:block lg:space-y-6 lg:overflow-visible lg:px-3 lg:pb-0">
        {GROUPS.map((g) => (
          <div key={g.title} className="flex gap-1 lg:block lg:space-y-1">
            <p className="num hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70 lg:block">{g.title}</p>
            {g.items.map((it) => {
              const active = isActive(it.href, path);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={`${item} shrink-0 whitespace-nowrap ${active ? "bg-surface-2 text-foreground shadow-[inset_3px_0_0_var(--pen)]" : "text-muted hover:bg-surface-2/60 hover:text-foreground"}`}
                >
                  <Icon name={it.icon} />
                  {it.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="hidden space-y-1 border-t border-border p-3 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
        <Link href="/" target="_blank" className={`${item} text-muted hover:bg-surface-2/60 hover:text-foreground`}>
          <Icon name="site" />
          View the site
        </Link>
        <form action={logout}>
          <button type="submit" className={`${item} w-full text-muted hover:bg-surface-2/60 hover:text-score-1`}>
            <Icon name="logout" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
