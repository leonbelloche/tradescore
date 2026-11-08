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

export const metadata: Metadata = { title: "Settings — Admin", robots: { index: false } };

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
      <AdminHeader title="Settings" current="/admin/settings" sub={`Season ${league.current_season}`} />
      <Card className="p-4 sm:p-5">
        <SettingsForm
          capMillions={league.salary_cap / 1_000_000}
          tradeOfTheWeek={site.tradeOfTheWeek ?? ""}
          trades={trades.map((t) => ({ slug: t.id, label: `${t.date} · ${t.teams.map((x) => `${x.team.short_name ?? x.team.name} ${x.score}`).join(" / ")}` }))}
        />
      </Card>
      <section>
        <SectionTitle title="Server keys" sub="set in .env.local and in Vercel → Settings → Environment Variables" />
        <Card className="divide-y divide-border text-sm">
          {[
            ["ADMIN_PASSWORD", !!process.env.ADMIN_PASSWORD, "your admin password (12+ characters)"],
            ["SUPABASE_SECRET_KEY", !!process.env.SUPABASE_SECRET_KEY, "lets the admin and the daily refresh write to the database"],
            ["CRON_SECRET", !!process.env.CRON_SECRET, "protects the daily refresh (any long random text)"],
          ].map(([name, ok, what]) => (
            <div key={String(name)} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={ok ? "text-score-5" : "text-score-1"}>{ok ? "✓" : "✕"}</span>
              <code className="num font-bold">{name}</code>
              <span className="text-muted">{what}</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-xs text-muted">Values are never shown here, only whether they are set.</p>
      </section>
    </div>
  );
}
