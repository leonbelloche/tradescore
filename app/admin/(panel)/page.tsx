import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import { RefreshButton } from "@/components/admin/forms";
import LoadingBlock from "@/components/LoadingBlock";
import { Card, SectionTitle } from "@/components/ui";
import { claudeConfigured } from "@/lib/admin/claude";
import { detectedTrades } from "@/lib/admin/detected";
import type { SiteSettings } from "@/lib/admin/refresh";
import { requireAdmin } from "@/lib/admin/session";
import { lastDays, type DayStats } from "@/lib/admin/stats";
import { postsForToday } from "@/lib/admin/today";
import { formatMoney } from "@/lib/format";
import { getValuedPlayers } from "@/lib/players/values";
import { getScoredTrades } from "@/lib/trades/scored";

export const metadata: Metadata = { title: "Admin — Trade Score", robots: { index: false } };

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Dashboard />
    </Suspense>
  );
}

// Hours since an ISO date (null = never). Read after the session check, so at request time.
function hoursSince(iso?: string): number | null {
  return iso ? (Date.now() - Date.parse(iso)) / 3_600_000 : null;
}
const ago = (h: number) => (h < 1 ? "less than an hour ago" : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`);

async function Dashboard() {
  await requireAdmin();
  const [{ today, posts }, { league, players }, trades] = await Promise.all([postsForToday(), getValuedPlayers(), getScoredTrades()]);
  const [stats, detected] = await Promise.all([lastDays(14, today), detectedTrades(trades.map((t) => t.source ?? ""))]);
  const site = (league.rules_json.site ?? {}) as SiteSettings;
  const age = hoursSince(site.lastRefresh);
  const missing = players.filter((p) => !p.hasContract).sort((a, b) => b.gameScore - a.gameScore);
  const warnings = trades.filter((t) => t.warnings.length).length;
  const todayStats = stats?.at(-1);
  const week = (k: "visit" | "signup") => stats?.slice(-7).reduce((s, d) => s + d[k], 0) ?? 0;

  // What needs attention, most important first.
  const todo: { text: string; href: string; level: "high" | "mid" }[] = [];
  if (!claudeConfigured()) todo.push({ text: "Claude is not connected: add ANTHROPIC_API_KEY to write posts, replies and videos", href: "/admin/x", level: "mid" });
  if (!process.env.SUPABASE_SECRET_KEY || !process.env.CRON_SECRET) todo.push({ text: "Some server keys are missing", href: "/admin/settings", level: "high" });
  if (stats === null) todo.push({ text: "Visit and sign-up counters are not set up (run supabase/migrations/003_admin.sql)", href: "/admin", level: "high" });
  if (site.lastRefreshError && (!site.lastRefresh || site.lastRefreshError.at > site.lastRefresh)) todo.push({ text: `Last data refresh failed: ${site.lastRefreshError.message}`, href: "/admin", level: "high" });
  if (age === null || age > 36) todo.push({ text: "Data is more than a day old: refresh it", href: "/admin", level: "high" });
  if (detected.length) todo.push({ text: `${detected.length} ESPN trade line${detected.length > 1 ? "s" : ""} not on the site yet`, href: "/admin/trades", level: "high" });
  const topMissing = missing.slice(0, 5).map((p) => p.name.split(" ").slice(-1)[0]).join(", ");
  if (missing.length) todo.push({ text: `${missing.length} players without a contract (top: ${topMissing})`, href: "/admin/contracts", level: "mid" });
  if (warnings) todo.push({ text: `${warnings} trade${warnings > 1 ? "s have" : " has"} data warnings`, href: "/admin/trades", level: "mid" });

  return (
    <div className="space-y-10">
      <AdminHeader title="Dashboard" sub="Everything you need to run Trade Score, on one page." />

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Kpi label="Visitors today" value={todayStats?.visit ?? "—"} sub={stats ? `${week("visit")} this week` : "counter not set up"} />
        <Kpi label="Sign-ups today" value={todayStats?.signup ?? "—"} sub={stats ? `${week("signup")} this week` : "counter not set up"} />
        <Kpi label="X posts ready" value={posts.length} sub="for today" href="/admin/x" />
        <Kpi label="Trades graded" value={trades.length} sub={trades[0] ? `latest ${trades[0].date}` : "none yet"} href="/admin/trades" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Traffic chart */}
        <section>
          <SectionTitle title="Traffic" sub="last 14 days" />
          <Card className="p-4">{stats ? <TrafficChart days={stats} /> : <SetupCounters />}</Card>
        </section>

        {/* To do */}
        <section>
          <SectionTitle title="To do" sub={todo.length ? `${todo.length} item${todo.length > 1 ? "s" : ""}` : "all good"} />
          <Card className="divide-y divide-border">
            {todo.length ? (
              todo.map((t) => (
                <Link key={t.text} href={t.href} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-surface-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.level === "high" ? "bg-score-1" : "bg-score-3"}`} aria-hidden />
                  <span className="flex-1">{t.text}</span>
                  <span className="text-accent" aria-hidden>▸</span>
                </Link>
              ))
            ) : (
              <p className="p-4 text-sm text-score-5">✓ Nothing to fix. Go post on X.</p>
            )}
          </Card>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next X posts */}
        <section>
          <SectionTitle title="Next posts on X" action={<Link href="/admin/x" className="display text-sm font-bold text-accent hover:underline">all {posts.length} ▸</Link>} />
          <Card className="divide-y divide-border">
            {posts.slice(0, 3).map((p) => (
              <Link key={p.id} href="/admin/x" className="block px-4 py-3 hover:bg-surface-2">
                <span className="flex items-center gap-2">
                  <span className="num rounded bg-surface-2 px-1.5 text-xs font-bold">{p.time}</span>
                  <span className="display text-xs font-bold text-accent">{p.kind}</span>
                </span>
                <span className="mt-1 line-clamp-2 block whitespace-pre-line text-sm text-muted">{p.text}</span>
              </Link>
            ))}
          </Card>
        </section>

        {/* Data health */}
        <section>
          <SectionTitle title="Data" sub="ESPN, refreshed every morning at 6 AM ET" />
          <Card className="space-y-4 p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Fact label="Last refresh" value={age === null ? "never" : ago(age)} />
              <Fact label="Players" value={String(players.length)} />
              <Fact label="With a contract" value={`${players.length - missing.length} (${Math.round(((players.length - missing.length) / Math.max(1, players.length)) * 100)}%)`} />
              <Fact label="Salary cap" value={formatMoney(league.salary_cap)} />
            </dl>
            {site.lastRefreshSummary && (
              <p className="text-xs text-muted">
                Last run: {site.lastRefreshSummary.newPlayers.length} new players, {site.lastRefreshSummary.moved.length} moved, {site.lastRefreshSummary.released} released,{" "}
                {site.lastRefreshSummary.contractsAdded} contracts added ({site.lastRefreshSummary.seconds}s).
                {site.lastRefreshSummary.moved.length > 0 && ` Moves: ${site.lastRefreshSummary.moved.slice(0, 4).join(" · ")}.`}
              </p>
            )}
            <RefreshButton />
          </Card>
        </section>
      </div>

      {/* Shortcuts */}
      <section>
        <SectionTitle title="Shortcuts" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["✦ Write a post", "/admin/x"],
            ["𝕏 Next post", "/admin/x"],
            ["● Weekly Reel", "/admin/instagram"],
            ["Add a trade", "/admin/trades#add"],
            ["Fill contracts", "/admin/contracts"],
            ["Trade of the day", "/admin/settings"],
          ].map(([label, href]) => (
            <Link key={label} href={href} className="display flex min-h-14 items-center justify-center rounded-xl border border-border bg-surface px-3 text-center text-sm font-bold hover:border-accent">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, href }: { label: string; value: React.ReactNode; sub: string; href?: string }) {
  const body = (
    <>
      <p className="display text-[11px] font-bold text-muted">{label}</p>
      <p className="display mt-1 text-3xl font-extrabold tabular-nums sm:text-4xl">{value}</p>
      <p className="num mt-0.5 text-[11px] text-muted">{sub}</p>
    </>
  );
  const cls = "block rounded-[14px] border border-border bg-surface p-3 sm:p-4";
  return href ? <Link href={href} className={`${cls} hover:border-accent`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="display text-[11px] font-bold text-muted">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}

// Visitors (bars) and sign-ups (accent dots) per day.
function TrafficChart({ days }: { days: DayStats[] }) {
  const max = Math.max(1, ...days.map((d) => d.visit));
  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={`Visitors per day, last ${days.length} days`}>
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.visit} visitors, ${d.signup} sign-ups`}>
            {d.signup > 0 && <span className="num mx-auto mb-1 text-[10px] font-bold text-accent">+{d.signup}</span>}
            <div className="rounded-t bg-sky-400/70 group-hover:bg-sky-300" style={{ height: `${(d.visit / max) * 100}%`, minHeight: d.visit ? 4 : 1 }} />
          </div>
        ))}
      </div>
      <div className="num mt-1 flex justify-between text-[10px] text-muted">
        <span>{days[0].day.slice(5)}</span>
        <span>today</span>
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-400/70" />visitors (one per browser per day)</span>
        <span className="text-accent">+n = sign-ups</span>
      </p>
    </div>
  );
}

function SetupCounters() {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-bold">The counters are not set up yet.</p>
      <p className="text-muted">1. Add SUPABASE_SECRET_KEY in Vercel (Settings → Environment Variables), then redeploy.</p>
      <p className="text-muted">
        2. Open Supabase → SQL Editor, paste the content of <code className="num">supabase/migrations/003_admin.sql</code>, click Run. Visitors and sign-ups will then
        show up here, day by day (numbers only, no personal data).
      </p>
    </div>
  );
}
