import { Suspense } from "react";
import SiteChrome from "@/components/layout/SiteChrome";
import DailyRefresh from "@/lib/admin/autoRefresh";

// Every public page (home, games, news, players...) gets the ticker, header, nav and footer.
// DailyRefresh starts the ESPN data refresh in the background once a day (first visit after 20 hours).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteChrome>{children}</SiteChrome>
      <Suspense fallback={null}>
        <DailyRefresh />
      </Suspense>
    </>
  );
}
