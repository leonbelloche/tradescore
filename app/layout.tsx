import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeLab — NBA Trade Simulator",
  description: "Build an NBA trade and get a Trade Score out of 100 for each team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-surface/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-black tracking-tight">
              Trade<span className="text-accent">Lab</span>
            </Link>
            <div className="flex gap-4 text-sm text-muted">
              <Link href="/trade" className="hover:text-foreground">
                Simulator
              </Link>
              <Link href="/method" className="hover:text-foreground">
                Method
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
          TradeLab · Not affiliated with the NBA
        </footer>
      </body>
    </html>
  );
}
