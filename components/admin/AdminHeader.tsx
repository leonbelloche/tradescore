import Link from "next/link";
import { logout } from "@/app/admin/actions";

const SECTIONS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/x", label: "X posts" },
  { href: "/admin/trades", label: "Trades" },
  { href: "/admin/contracts", label: "Contracts" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/calibration", label: "Calibration" },
];

// Title + admin sub-navigation + log out. `current` is the active section's href.
export default function AdminHeader({ title, current, sub }: { title: string; current: string; sub?: string }) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="display text-sm font-bold text-accent">Admin</p>
          <h1 className="display text-4xl font-extrabold leading-[0.9]">{title}</h1>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>
        <form action={logout}>
          <button type="submit" className="display min-h-11 rounded-lg border border-border-strong px-4 text-sm font-bold hover:border-accent">
            Log out
          </button>
        </form>
      </div>
      <nav aria-label="Admin" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px [scrollbar-width:none]">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={s.href === current ? "page" : undefined}
            className={`display shrink-0 border-b-2 px-3 py-2 text-sm font-bold ${
              s.href === current ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
