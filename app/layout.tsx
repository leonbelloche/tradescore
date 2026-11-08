import type { Metadata } from "next";
import { Suspense } from "react";
import { Big_Shoulders, Inter, JetBrains_Mono } from "next/font/google";
import Logo from "@/components/layout/Logo";
import NavLinks, { NavLinksView } from "@/components/layout/NavLinks";
import Ticker from "@/components/layout/Ticker";
import UserBadge from "@/components/layout/UserBadge";
import "./globals.css";

const shoulders = Big_Shoulders({ variable: "--font-shoulders", subsets: ["latin"], weight: ["600", "700", "800", "900"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "600"] });

// Absolute base for share links and images (Vercel sets the production domain).
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Trade Score — who won the NBA trade?",
  description: "Every NBA trade gets a Trade Score from 1 to 99 for each team. See who won, who got fleeced, and build your own.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shoulders.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="sticky top-0 z-40">
          <Suspense fallback={<div className="h-8 border-b border-border bg-black" />}>
            <Ticker />
          </Suspense>
          <header className="border-b border-border bg-surface/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-3 pt-2 sm:px-6">
              <Logo />
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
      </body>
    </html>
  );
}
