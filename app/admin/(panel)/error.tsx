"use client";

// Shown when an admin page crashes, inside the admin panel (sidebar stays usable).
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-score-1/40 bg-score-1/10 p-6">
      <p className="display text-xl font-bold">Cette page de l’admin n’a pas pu s’afficher</p>
      <p className="text-sm text-muted">
        Le plus souvent, une clé manque dans .env.local (SUPABASE_SECRET_KEY par exemple), ou la base de données est en panne quelques instants.
      </p>
      {error.digest && <p className="num text-xs text-muted">Code d’erreur : {error.digest}</p>}
      <button type="button" onClick={reset} className="display min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-black">
        Réessayer
      </button>
    </div>
  );
}
