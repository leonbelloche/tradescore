import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import IdeaPost from "@/components/news/IdeaPost";
import ScoreBadge from "@/components/ScoreBadge";
import { Card, SectionTitle, TeamMark } from "@/components/ui";
import { getNews, getTransactions, isTradeTalk, type NewsItem } from "@/lib/nba/news";
import { getValuedPlayers, type ValuedPlayer } from "@/lib/players/values";
import { tradeIdeas } from "@/lib/trades/ideas";

export const metadata: Metadata = {
  title: "News — Trade Score",
  description: "Today's NBA trade ideas written up and graded by Trade Score, trade talk from ESPN, headlines and roster moves.",
};

export default function NewsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">Updated every day</p>
        <h1 className="display text-4xl font-extrabold leading-[0.9] sm:text-5xl">News</h1>
        <p className="max-w-xl text-muted">The trades that could happen today, written up and graded before they happen. Plus trade talk and roster moves from ESPN.</p>
      </header>
      <Suspense fallback={<div className="h-[80vh] animate-pulse rounded-2xl bg-surface" />}>
        <News />
      </Suspense>
    </div>
  );
}

const ago = (iso: string, now: number) => {
  const h = Math.round((now - Date.parse(iso)) / 3_600_000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

// Time of the request ("today" changes the trade ideas).
async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

async function News() {
  const now = await requestTime();
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // 2026-11-08
  const [{ league, teams, players }, news, moves] = await Promise.all([getValuedPlayers(), getNews(), getTransactions(15)]);
  const ideas = tradeIdeas(today, league, teams, players);
  const byName = new Map(players.map((p) => [p.name, p]));
  const logos = new Map(teams.map((t) => [t.abbreviation, t.logo_url]));
  const statsOf = (id: string) => teams.flatMap((t) => t.roster).find((p) => p.id === id)?.stats_json[league.current_season];

  const talk = news.filter(isTradeTalk);
  const headlines = news.filter((n) => !isTradeTalk(n) && (n.type === "HeadlineNews" || n.type === "Story") && n.image);
  const [lead, ...more] = headlines;

  return (
    <>
      <section>
        <SectionTitle
          index={1}
          title="Trade ideas of the day"
          sub={new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}
        />
        <p className="-mt-2 mb-5 max-w-2xl text-sm text-muted">
          A losing team sells a good player to a winner, for salary filler and a future 1st. Real rosters, salaries checked, graded by our engine,
          new ideas every day. <b className="text-foreground">Our ideas, not reported rumors.</b>
        </p>
        {ideas.length ? (
          <div className="space-y-5">
            <IdeaPost idea={ideas[0]} day={today} stats={statsOf(ideas[0].target.id)} byName={byName} featured />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {ideas.slice(1).map((idea) => (
                <IdeaPost key={idea.id} idea={idea} day={today} stats={statsOf(idea.target.id)} byName={byName} />
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center text-muted">No deal fits today&apos;s salaries. Come back tomorrow.</Card>
        )}
      </section>

      <section>
        <SectionTitle index={2} title="Trade talk" sub="from ESPN" live />
        {talk.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {talk.map((n) => (
              <li key={n.id} className="min-w-0">
                <Story item={n} now={now} byName={byName} />
              </li>
            ))}
          </ul>
        ) : (
          <Card className="p-5 text-sm text-muted">No trade rumor in ESPN&apos;s feed right now. When one shows up, it lands here with the Trade Value of every player named.</Card>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0">
          <SectionTitle index={3} title="Headlines" sub="ESPN" />
          {lead && <Story item={lead} now={now} byName={byName} big />}
          <ul className="mt-3 space-y-3">
            {more.slice(0, 6).map((n) => (
              <li key={n.id}>
                <Story item={n} now={now} byName={byName} />
              </li>
            ))}
          </ul>
        </section>
        <section className="min-w-0">
          <SectionTitle index={4} title="Roster moves" sub="signings, waivers, trades" />
          <Card className="divide-y divide-border/60">
            {moves.map((m, i) => (
              <div key={`${m.date}-${i}`} className="flex gap-2.5 px-3 py-2.5 text-sm">
                <TeamMark abbreviation={m.abbreviation} logoUrl={logos.get(m.abbreviation)} />
                <span className="min-w-0">
                  <span className="display block text-xs font-bold text-muted">
                    {m.team} · {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                  </span>
                  <span>{m.description}</span>
                </span>
              </div>
            ))}
          </Card>
        </section>
      </div>
      <p className="text-xs text-muted">Photos, news and moves: ESPN. Trade ideas, grades and values: Trade Score.</p>
    </>
  );
}

// An ESPN story: photo, headline, summary, and the Trade Value of each player it names. `big` = lead story.
function Story({ item, now, byName, big = false }: { item: NewsItem; now: number; byName: Map<string, ValuedPlayer>; big?: boolean }) {
  const mentioned = item.athletes.map((n) => byName.get(n)).filter((p): p is ValuedPlayer => !!p).slice(0, 4);
  const chips = mentioned.length > 0 && (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {mentioned.map((p) => (
        <Link key={p.id} href={`/player/${p.slug}`} className="flex items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pl-2 pr-0.5 text-xs hover:border-accent/60">
          {p.name}
          <ScoreBadge score={p.score} />
        </Link>
      ))}
    </span>
  );

  if (big) {
    return (
      <Card className="overflow-hidden">
        <Wrap url={item.url} className="block">
          {item.image && (
            <div className="relative aspect-video">
              <Image src={item.image} alt="" fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover transition group-hover:scale-[1.02]" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className="display rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">Top story</span>
                <h3 className="display mt-2 text-2xl font-extrabold leading-tight group-hover:text-accent sm:text-3xl">{item.headline}</h3>
              </div>
            </div>
          )}
        </Wrap>
        <div className="p-4 pt-3">
          <p className="num text-[11px] text-muted">{ago(item.published, now)} · ESPN</p>
          {item.description && <p className="mt-1 text-sm text-foreground/90">{item.description}</p>}
          {chips}
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex gap-3 p-3">
      {item.image && (
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-36">
          <Image src={item.image} alt="" fill sizes="144px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Wrap url={item.url} className="block">
          <span className="num text-[11px] text-muted">{ago(item.published, now)} · ESPN</span>
          <span className="display mt-0.5 line-clamp-3 block text-base font-bold leading-tight group-hover:text-accent">{item.headline}</span>
        </Wrap>
        {chips}
      </div>
    </Card>
  );
}

// Links out to ESPN when the story has a URL.
function Wrap({ url, children, className }: { url: string | null; children: React.ReactNode; className: string }) {
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${className} group`}>
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
  );
}
