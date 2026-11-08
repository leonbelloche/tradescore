"use client";

// Shown when an admin page crashes, inside the admin panel (sidebar stays usable).
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-score-1/40 bg-score-1/10 p-6">
      <p className="display text-xl font-bold">This admin page could not load</p>
      <p className="text-sm text-muted">
        Most often a server key is missing in Vercel (Settings → Environment Variables: SUPABASE_SECRET_KEY, CRON_SECRET, ANTHROPIC_API_KEY), or the database is down for a moment.
      </p>
      {error.digest && <p className="num text-xs text-muted">Error code: {error.digest}</p>}
      <button type="button" onClick={reset} className="display min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-black">
        Try again
      </button>
    </div>
  );
}
