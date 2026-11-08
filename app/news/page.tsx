import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import ScoreBadge, { GradeChip, TierLabel } from "@/components/ScoreBadge";
import { Card, Record, SectionTitle, TeamMark } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { getNews, getTransactions, isTradeTalk, type NewsItem } from "@/lib/nba/news";
import { getValuedPlayers, type ValuedPlayer } from "@/lib/players/values";
import { reasonsFor } from "@/lib/score";
import { tradeIdeas, type TradeIdea } from "@/lib/trades/ideas";

export const metadata: Metadata = {
  title: "News — Trade Score",
  description: "Today's NBA trade ideas scored by Trade Score, trade talk from ESPN, and the latest roster moves.",
};

export default function NewsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">Updated every day</p>
        <h1 className="display text-4xl font-extrabold leading-[0.9] sm:text-5xl">News</h1>
        <p className="max-w-xl text-muted">Possible trades of the day, graded before they happen. Plus trade talk and roster moves from ESPN.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
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

  const talk = news.filter(isTradeTalk);
  const headlines = news.filter((n) => !isTradeTalk(n) && (n.type === "HeadlineNews" || n.type === "Story")).slice(0, 8);

  return (
    <>
      <section>
        <SectionTitle
          index={1}
          title="Trade ideas of the day"
          sub={new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}
        />
        <p className="-mt-2 mb-4 max-w-2xl text-sm text-muted">
          Deals that could make sense today: a losing team sells a good veteran to a winner, for salary filler and a future 1st. Built from real
          rosters, salaries checked, and graded by our engine. New ideas every day. These are <b className="text-foreground">our ideas, not reported rumors</b>.
        </p>
        {ideas.length ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {ideas.map((idea, i) => (
              <IdeaCard key={idea.id} idea={idea} index={i + 1} byName={byName} />
            ))}
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
                <Article item={n} now={now} byName={byName} />
              </li>
            ))}
          </ul>
        ) : (
          <Card className="p-5 text-sm text-muted">No trade rumor in ESPN&apos;s feed right now. When one shows up, it lands here with the Trade Value of every player named.</Card>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0">
          <SectionTitle index={3} title="Headlines" />
          <ul className="space-y-3">
            {headlines.map((n) => (
              <li key={n.id}>
                <Article item={n} now={now} byName={byName} />
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
      <p className="text-xs text-muted">News and moves: ESPN. Trade ideas and values: Trade Score.</p>
    </>
  );
}

function IdeaCard({ idea, index, byName }: { idea: TradeIdea; index: number; byName: Map<string, ValuedPlayer> }) {
  const sides = [
    { team: idea.buyer, result: idea.buyerResult },
    { team: idea.seller, result: idea.sellerResult },
  ];
  const why = reasonsFor(idea.buyerResult)[0];
  const target = idea.target;
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="led flex items-center justify-between border-b border-border bg-black/40 px-4 py-2.5">
        <span className="display rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">Idea #{index}</span>
        <span className="display text-xs font-bold text-muted">
          {idea.buyer.short_name} get {target.name.split(" ").slice(-1)[0]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={`/player/${target.slug}`} className="flex items-center gap-3 hover:text-accent">
          {target.headshotUrl ? (
            <Image src={target.headshotUrl} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full border border-border bg-surface-2 object-cover object-top" />
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="display block truncate text-xl font-extrabold leading-tight">{target.name}</span>
            <span className="num text-[11px] text-muted">
              {target.position} · {target.age} yrs · {formatMoney(target.salary)}
            </span>
          </span>
          <ScoreBadge score={target.score} size="md" />
        </Link>
        <div className="grid grid-cols-2 gap-2">
          {sides.map(({ team, result }) => (
            <div key={team.id} className="min-w-0 rounded-lg border border-border bg-background/60 p-2.5">
              <div className="flex items-center gap-1.5">
                <TeamMark abbreviation={team.abbreviation} logoUrl={team.logo_url} />
                <span className="display truncate text-sm font-bold">{team.short_name ?? team.name}</span>
              </div>
              <Record wins={team.wins} losses={team.losses} className="mt-1" />
              <div className="mt-2 flex items-center gap-1.5">
                <ScoreBadge score={result.score} size="md" />
                <GradeChip score={result.score} />
              </div>
              <TierLabel score={result.score} className="mt-1 block text-xs" />
              <p className="mt-1.5 text-[11px] leading-snug text-muted">
                Gets{" "}
                {result.received.map((d, i) => {
                  const p = byName.get(d.label);
                  return (
                    <span key={d.label}>
                      {i > 0 && ", "}
                      {p ? <Link href={`/player/${p.slug}`} className="text-foreground hover:text-accent">{d.label}</Link> : <span className="text-foreground">{d.label}</span>}
                    </span>
                  );
                })}
              </p>
            </div>
          ))}
        </div>
        {why && (
          <p className="mt-auto border-l-2 border-accent pl-2.5 text-xs text-muted">
            <span className="display font-bold text-accent">For the {idea.buyer.short_name}: </span>
            {why}
          </p>
        )}
      </div>
    </Card>
  );
}

function Article({ item, now, byName }: { item: NewsItem; now: number; byName: Map<string, ValuedPlayer> }) {
  const mentioned = item.athletes.map((n) => byName.get(n)).filter((p): p is ValuedPlayer => !!p).slice(0, 4);
  const body = (
    <>
      <span className="num text-[11px] text-muted">{ago(item.published, now)}</span>
      <span className="display mt-0.5 block text-base font-bold leading-tight sm:text-lg">{item.headline}</span>
      {item.description && <span className="mt-1 line-clamp-2 block text-sm text-muted">{item.description}</span>}
    </>
  );
  return (
    <Card className="flex gap-3 p-3">
      {item.image && (
        <Image src={item.image} alt="" width={96} height={64} className="hidden h-16 w-24 shrink-0 rounded-md object-cover sm:block" />
      )}
      <div className="min-w-0 flex-1">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block hover:text-accent">
            {body}
          </a>
        ) : (
          body
        )}
        {mentioned.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {mentioned.map((p) => (
              <Link key={p.id} href={`/player/${p.slug}`} className="flex items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pl-2 pr-0.5 text-xs hover:border-accent/60">
                {p.name}
                <ScoreBadge score={p.score} />
              </Link>
            ))}
          </span>
        )}
      </div>
    </Card>
  );
}
