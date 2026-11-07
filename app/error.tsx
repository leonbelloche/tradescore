"use client";

import { Button, Card } from "@/components/ui";

// Shown when a page crashes (e.g. the database is unreachable).
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-md space-y-3 p-6 text-center">
      <p className="display text-2xl font-bold">Something went wrong</p>
      <p className="text-sm text-muted">We could not load this page. The data source may be down for a moment.</p>
      <div className="flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="ghost">
          Home
        </Button>
      </div>
    </Card>
  );
}
