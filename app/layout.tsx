import type { Metadata } from "next";
import Link from "next/link";
import { Oswald, Roboto } from "next/font/google";
import "./globals.css";

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["500", "600", "700"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "TRADE SCORE NBA: who won the trade?",
  description: "Every NBA trade gets a Trade Score out of 100 for each team. See who won, who got fleeced, and build your own.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${oswald.variable} ${roboto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="sticky top-0 z-40">
          {/* Season status bar */}
          <div className="flex items-center justify-center gap-3 bg-black px-4 py-1.5 text-xs">
            <span className="display flex items-center gap-1.5 font-semibold text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-score-5" />
              2026-27 season live
            </span>
            <span className="text-muted">Stats via ESPN</span>
          </div>

          {/* Header */}
          <header className="border-b border-border bg-surface">
            <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-3 py-3 sm:px-6">
              <Link href="/" className="display text-2xl font-bold tracking-[0.06em] sm:text-3xl">
                Trade <span className="text-accent">Score</span>
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/method" className="display hidden text-sm font-semibold text-muted hover:text-foreground sm:block">
                  How it works
                </Link>
                <Link
                  href="/trade"
                  className="display rounded-lg border border-border-strong px-3 py-2 text-sm font-semibold hover:border-accent"
                >
                  Build a trade
                </Link>
              </div>
            </nav>
          </header>
        </div>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 pb-8 pt-6 sm:px-6">{children}</main>

        <footer className="border-t border-border bg-surface px-4 py-6 text-center text-xs text-muted">
          <p className="display mb-1 text-sm font-semibold text-foreground">
            Trade <span className="text-accent">Score</span>
          </p>
          Not affiliated with the NBA or its teams.
        </footer>
      </body>
    </html>
  );
}
