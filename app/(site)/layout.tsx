import SiteChrome from "@/components/layout/SiteChrome";

// Every public page (home, games, news, players...) gets the ticker, header, nav and footer.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
