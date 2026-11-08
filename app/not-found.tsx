import SiteChrome from "@/components/layout/SiteChrome";
import { Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <SiteChrome>
      <Card className="mx-auto max-w-md space-y-3 p-6 text-center">
        <p className="display text-2xl font-bold">Page not found</p>
        <p className="text-sm text-muted">This trade, team or player does not exist (or not anymore).</p>
        <div className="flex justify-center gap-3">
          <Button href="/">All trades</Button>
          <Button href="/trade" variant="ghost">
            Build a trade
          </Button>
        </div>
      </Card>
    </SiteChrome>
  );
}
