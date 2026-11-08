import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import VisitTracker from "@/components/layout/VisitTracker";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Trade Score — who won the NBA trade?",
  description: "Every NBA trade gets a Trade Score from 1 to 99 for each team. See who won, who got fleeced, and build your own.",
};

// Root: fonts, theme and the visit counter only. Public pages add their frame in app/(site)/layout.tsx,
// the admin has its own in app/admin/layout.tsx.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
