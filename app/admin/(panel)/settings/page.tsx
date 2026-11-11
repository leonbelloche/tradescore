import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { SettingsForm } from "@/components/admin/forms";
import LoadingBlock from "@/components/LoadingBlock";
import { Card, SectionTitle } from "@/components/ui";
import type { SiteSettings } from "@/lib/admin/refresh";
import { requireAdmin } from "@/lib/admin/session";
import { getLeagueWithRosters } from "@/lib/db/teams";
import { getScoredTrades } from "@/lib/trades/scored";

export const metadata: Metadata = { title: "Réglages — Admin", robots: { index: false } };

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await requireAdmin();
  const [{ league }, trades] = await Promise.all([getLeagueWithRosters("nba"), getScoredTrades()]);
  const site = (league.rules_json.site ?? {}) as SiteSettings;

  return (
    <div className="space-y-8">
      <AdminHeader title="Réglages" sub={`Saison ${league.current_season}`} />
      <Card className="p-4 sm:p-5">
        <SettingsForm
          capMillions={league.salary_cap / 1_000_000}
          tradeOfTheWeek={site.tradeOfTheWeek ?? ""}
          trades={trades.map((t) => ({ slug: t.id, label: `${t.date} · ${t.teams.map((x) => `${x.team.short_name ?? x.team.name} ${x.score}`).join(" / ")}` }))}
        />
      </Card>
      <section>
        <SectionTitle title="Clés du serveur" sub="dans le fichier .env.local (et chez l'hébergeur quand le site sera en ligne)" />
        <Card className="divide-y divide-border text-sm">
          {[
            ["ADMIN_PASSWORD", !!process.env.ADMIN_PASSWORD, "ton mot de passe admin (12 caractères ou plus). Pas demandé sur ton ordinateur."],
            ["SUPABASE_SECRET_KEY", !!process.env.SUPABASE_SECRET_KEY, "permet à l'admin et à la mise à jour quotidienne d'écrire dans la base"],
            ["CRON_SECRET", !!process.env.CRON_SECRET, "protège l'adresse de mise à jour automatique en ligne (un long texte au hasard)"],
            ["ANTHROPIC_API_KEY", !!process.env.ANTHROPIC_API_KEY, "permet à Claude Opus 5.5 d'écrire des posts, des réponses et des scripts vidéo (console.anthropic.com). Facultatif."],
            ["X_API_KEY + 3 autres", !!(process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_TOKEN_SECRET), "publier sur X en un clic (developer.x.com)"],
            ["INSTAGRAM_USER_ID + INSTAGRAM_ACCESS_TOKEN", !!(process.env.INSTAGRAM_USER_ID && process.env.INSTAGRAM_ACCESS_TOKEN), "publier sur Instagram en un clic (developers.facebook.com)"],
          ].map(([name, ok, what]) => (
            <div key={String(name)} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={ok ? "text-score-5" : "text-score-1"}>{ok ? "✓" : "✕"}</span>
              <code className="num font-bold">{name}</code>
              <span className="text-muted">{what}</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-xs text-muted">Les valeurs ne sont jamais affichées ici, seulement si elles sont réglées ou non.</p>
      </section>
    </div>
  );
}
