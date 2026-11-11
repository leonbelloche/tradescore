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
import { forChannel } from "@/lib/social/channels";
import { alreadyPublished, historyReady, publishedOn } from "@/lib/social/history";
import { weekOf } from "@/lib/social/reels";
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
const ilYa = (h: number) => (h < 1 ? "il y a moins d'une heure" : h < 48 ? `il y a ${Math.round(h)} h` : `il y a ${Math.round(h / 24)} jours`);
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// One line of the daily list: what to do, where it stands, one button.
type Task = { title: string; status: string; done: boolean; href: string; button: string; progress?: number };
// A setup problem: what is wrong, in plain words, and how to fix it.
type Problem = { title: string; why: string; how: string; href?: string };

async function Dashboard() {
  await requireAdmin();
  const [{ today, posts }, { league, players }, trades] = await Promise.all([postsForToday(), getValuedPlayers(), getScoredTrades()]);
  const week = weekOf(today);
  const [stats, detected, published, reelDone, history] = await Promise.all([
    lastDays(14, today),
    detectedTrades(trades.map((t) => t.source ?? "")),
    publishedOn(today),
    alreadyPublished(`instagram:reel-${week.key}`),
    historyReady(),
  ]);
  const site = (league.rules_json.site ?? {}) as SiteSettings;
  const age = hoursSince(site.lastRefresh);
  const missing = players.filter((p) => !p.hasContract).length;
  const xQueue = forChannel(posts, "x");
  const xSent = xQueue.filter((p) => published[p.id]).length;
  const todayStats = stats?.at(-1);
  const lastWeek = (k: "visit" | "signup") => stats?.slice(-7).reduce((s, d) => s + d[k], 0) ?? 0;

  // ---------- Today's list: the routine, in order ----------
  const tasks: Task[] = [
    {
      title: "Poster sur X",
      status: xSent >= xQueue.length ? `Les ${xQueue.length} posts du jour sont envoyés` : `${xSent} post${xSent > 1 ? "s" : ""} envoyé${xSent > 1 ? "s" : ""} sur ${xQueue.length}`,
      done: xSent >= xQueue.length,
      href: "/admin/x",
      button: "Aller sur X",
      progress: xQueue.length ? xSent / xQueue.length : 1,
    },
    {
      title: "Reel Instagram de la semaine",
      status: reelDone ? "Envoyé cette semaine" : `Pas encore fait · ${week.daysLeft + 1} jour${week.daysLeft ? "s" : ""} restant${week.daysLeft ? "s" : ""}`,
      done: reelDone,
      href: "/admin/instagram",
      button: "Faire le Reel",
    },
    {
      title: "Ajouter les nouveaux trades",
      status: detected.length ? `ESPN a ${detected.length} trade${detected.length > 1 ? "s" : ""} qui ${detected.length > 1 ? "ne sont" : "n'est"} pas encore sur le site` : "Aucun nouveau trade",
      done: detected.length === 0,
      href: "/admin/trades",
      button: "Voir les trades",
    },
  ];
  const left = tasks.filter((t) => !t.done).length;

  // ---------- Problems: things that are broken or not set up ----------
  const problems: Problem[] = [];
  if (site.lastRefreshError && (!site.lastRefresh || site.lastRefreshError.at > site.lastRefresh))
    problems.push({ title: "La dernière mise à jour des données a échoué", why: site.lastRefreshError.message, how: "Clique sur « Mettre à jour maintenant » plus bas. Si ça échoue encore, ESPN est peut-être en panne : réessaie plus tard." });
  if (age === null || age > 36)
    problems.push({ title: "Les données ont plus d'un jour", why: "Les stats, les effectifs et les bilans ne sont plus à jour.", how: "Clique sur « Mettre à jour maintenant » plus bas (environ 30 secondes)." });
  if (stats === null)
    problems.push({
      title: "Les compteurs de visiteurs et d'inscriptions ne marchent pas",
      why: "La table qui les stocke n'existe pas encore dans Supabase.",
      how: "Ouvre Supabase → SQL Editor, colle le contenu du fichier supabase/migrations/003_admin.sql et clique sur Run. C'est à faire une seule fois.",
    });
  if (!history)
    problems.push({
      title: "Les posts envoyés ne sont pas enregistrés",
      why: "Le tableau de bord ne peut pas compter tes posts X ni savoir si le Reel de la semaine est fait (il affiche 0 même après un envoi).",
      how: "Ouvre Supabase → SQL Editor, colle le contenu du fichier supabase/migrations/004_social.sql et clique sur Run. C'est à faire une seule fois.",
    });
  if (!process.env.SUPABASE_SECRET_KEY)
    problems.push({ title: "La clé secrète Supabase manque", why: "Sans elle, l'admin ne peut rien enregistrer (trades, contrats, mises à jour).", how: "Ajoute SUPABASE_SECRET_KEY dans le fichier .env.local.", href: "/admin/settings" });
  if (missing > 0)
    problems.push({
      title: `${missing} joueurs n'ont pas de contrat`,
      why: "Leur salaire compte comme 0 $, donc leur Trade Value est trop haute.",
      how: "Va dans Contrats : les joueurs les plus importants sont en haut. Remplis au moins les premiers.",
      href: "/admin/contracts",
    });
  const warnings = trades.filter((t) => t.warnings.length).length;
  if (warnings)
    problems.push({ title: `${warnings} trade${warnings > 1 ? "s ont" : " a"} des données incomplètes`, why: "Un joueur ou un contrat manque, le score peut être faux.", how: "Va dans Trades et regarde les trades marqués en orange.", href: "/admin/trades" });

  return (
    <div className="space-y-10">
      <AdminHeader
        title="Tableau de bord"
        sub={`${longDate(today)} · ${left === 0 ? "tout est fait pour aujourd'hui ✓" : `${left} chose${left > 1 ? "s" : ""} à faire aujourd'hui`}`}
      />

      {/* 1. Today's routine */}
      <section>
        <SectionTitle title="À faire aujourd'hui" sub={left === 0 ? "terminé" : `${tasks.length - left}/${tasks.length} fait`} />
        <div className="grid gap-3 md:grid-cols-3">
          {tasks.map((t) => (
            <Card key={t.title} className={`flex flex-col gap-3 p-4 ${t.done ? "border-score-5/40" : "border-accent/50"}`}>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${t.done ? "border-score-5 bg-score-5 text-black" : "border-border-strong"}`}
                  aria-label={t.done ? "fait" : "à faire"}
                >
                  {t.done ? "✓" : ""}
                </span>
                <div className="min-w-0">
                  <p className="display font-extrabold leading-tight">{t.title}</p>
                  <p className={`mt-1 text-sm ${t.done ? "text-score-5" : "text-muted"}`}>{t.status}</p>
                </div>
              </div>
              {t.progress !== undefined && (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(t.progress * 100)}%` }} />
                </div>
              )}
              <Link
                href={t.href}
                className={`display mt-auto flex min-h-11 items-center justify-center rounded-xl text-sm font-bold ${t.done ? "border border-border text-muted hover:border-accent" : "bg-accent text-black hover:brightness-95"}`}
              >
                {t.button} ▸
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* 2. Numbers */}
      <section>
        <SectionTitle title="Les chiffres" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <Kpi label="Visiteurs aujourd'hui" value={todayStats?.visit ?? "—"} sub={stats ? `${lastWeek("visit")} sur 7 jours` : "compteur pas installé"} />
          <Kpi label="Inscriptions aujourd'hui" value={todayStats?.signup ?? "—"} sub={stats ? `${lastWeek("signup")} sur 7 jours` : "compteur pas installé"} />
          <Kpi label="Trades notés" value={trades.length} sub={trades[0] ? `dernier le ${trades[0].date}` : "aucun"} href="/admin/trades" />
          <Kpi label="Joueurs suivis" value={players.length} sub={`${players.length - missing} avec un contrat`} href="/admin/contracts" />
        </div>
        {stats && (
          <Card className="mt-3 p-4">
            <p className="display mb-3 text-sm font-bold">Visiteurs des 14 derniers jours</p>
            <TrafficChart days={stats} />
          </Card>
        )}
      </section>

      {/* 3. Problems */}
      <section>
        <SectionTitle title="À régler" sub={problems.length ? `${problems.length} problème${problems.length > 1 ? "s" : ""}` : "rien"} />
        {problems.length ? (
          <div className="space-y-2">
            {problems.map((p) => (
              <Card key={p.title} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-score-3" aria-hidden />
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <p className="font-bold">{p.title}</p>
                    <p className="text-muted">
                      <b className="text-foreground">Pourquoi c&apos;est gênant :</b> {p.why}
                    </p>
                    <p className="text-muted">
                      <b className="text-foreground">Comment régler :</b> {p.how}
                    </p>
                  </div>
                  {p.href && (
                    <Link href={p.href} className="display shrink-0 text-sm font-bold text-accent hover:underline">
                      Ouvrir ▸
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-sm text-score-5">✓ Rien à régler.</Card>
        )}
        {!claudeConfigured() && (
          <p className="mt-2 text-xs text-muted">
            Option : Claude n&apos;est pas branché (clé ANTHROPIC_API_KEY). Ce n&apos;est pas obligatoire : il sert seulement à réécrire des posts et à répondre à des
            tweets.
          </p>
        )}
      </section>

      {/* 4. Data */}
      <section>
        <SectionTitle title="Données" sub="ESPN · mises à jour toutes seules chaque jour" />
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1 text-sm">
            <p>
              <b>Dernière mise à jour :</b> {age === null ? "jamais" : ilYa(age)}
            </p>
            {site.lastRefreshSummary && (
              <p className="text-muted">
                {site.lastRefreshSummary.players} joueurs vérifiés · {site.lastRefreshSummary.moved.length} transfert{site.lastRefreshSummary.moved.length > 1 ? "s" : ""}
                {site.lastRefreshSummary.moved.length > 0 && ` (${site.lastRefreshSummary.moved.slice(0, 3).join(" · ")})`} · {site.lastRefreshSummary.newPlayers.length} nouveau
                {site.lastRefreshSummary.newPlayers.length > 1 ? "x" : ""} joueur{site.lastRefreshSummary.newPlayers.length > 1 ? "s" : ""}
              </p>
            )}
            <p className="text-xs text-muted">La première visite du site après 20 h sans mise à jour la lance toute seule. Le bouton sert à la forcer.</p>
          </div>
          <RefreshButton />
        </Card>
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

// Visitors (bars) and sign-ups (accent numbers) per day.
function TrafficChart({ days }: { days: DayStats[] }) {
  const max = Math.max(1, ...days.map((d) => d.visit));
  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={`Visiteurs par jour, ${days.length} derniers jours`}>
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.day} : ${d.visit} visiteurs, ${d.signup} inscriptions`}>
            {d.signup > 0 && <span className="num mx-auto mb-1 text-[10px] font-bold text-accent">+{d.signup}</span>}
            <div className="rounded-t bg-sky-400/70 group-hover:bg-sky-300" style={{ height: `${(d.visit / max) * 100}%`, minHeight: d.visit ? 4 : 1 }} />
          </div>
        ))}
      </div>
      <div className="num mt-1 flex justify-between text-[10px] text-muted">
        <span>{days[0].day.slice(5)}</span>
        <span>aujourd&apos;hui</span>
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-400/70" />
          visiteurs (un par navigateur et par jour)
        </span>
        <span className="text-accent">+n = inscriptions</span>
      </p>
    </div>
  );
}
