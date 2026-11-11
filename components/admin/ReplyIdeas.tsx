"use client";
// "Répondre à des gens": today's conversations on X with a ready reply that adds our numbers.
// 1) open the X search, 2) pick a popular post, 3) paste the reply. Never automatic: X bans automated replies.
import { useState } from "react";
import type { ReplyIdea } from "@/lib/admin/xPosts";

export default function ReplyIdeas({ ideas }: { ideas: ReplyIdea[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (ideas.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="display text-xl font-extrabold">Répondre à des gens</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Pour un nouveau compte, répondre sous les posts populaires est le meilleur moyen d&apos;être vu. Ouvre la recherche, choisis un post qui a déjà des
          likes, colle la réponse et réécris-la à ta façon, avec ton ton. Objectif : 15 à 20 réponses par jour (beaucoup plus utile que poster plus), jamais deux fois le même texte, et reste dans la discussion si on te répond.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ideas.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
            <p className="display text-sm font-bold">{r.topic}</p>
            <p className="flex-1 rounded-lg bg-background/60 px-3 py-2 text-sm">{r.reply}</p>
            <div className="grid grid-cols-2 gap-2">
              <a href={r.search} target="_blank" rel="noopener noreferrer" className="display flex min-h-10 items-center justify-center rounded-lg border border-border-strong text-xs font-bold hover:border-accent">
                1. Chercher sur 𝕏 ▸
              </a>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(r.reply).then(() => setCopied(r.id))}
                className={`display min-h-10 rounded-lg text-xs font-bold ${copied === r.id ? "border border-score-5 text-score-5" : "bg-foreground text-background hover:brightness-90"}`}
              >
                {copied === r.id ? "Copiée ✓" : "2. Copier la réponse"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
