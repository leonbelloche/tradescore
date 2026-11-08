import { Suspense } from "react";
import Logo from "@/components/layout/Logo";
import NavLinks, { NavLinksView } from "@/components/layout/NavLinks";
import Ticker from "@/components/layout/Ticker";
import UserBadge from "@/components/layout/UserBadge";

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
              <NavLinks />
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
