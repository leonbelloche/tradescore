import Image from "next/image";
import Link from "next/link";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import ScoreBadge, { GradeChip, TierLabel } from "@/components/ScoreBadge";
import { Record, TeamMark } from "@/components/ui";
import type { SeasonStats } from "@/lib/db/types";
import { formatMoney } from "@/lib/format";
import { getAthleteMedia } from "@/lib/nba/athleteMedia";
import type { ValuedPlayer } from "@/lib/players/values";
import { modeFromRecord, reasonsFor, type TeamMode } from "@/lib/score";
import type { TradeIdea } from "@/lib/trades/ideas";

const MODE_SENTENCE: Record<TeamMode, string> = {
  contender: "are built to win now",
  middle: "are fighting for a playoff spot",
  rebuild: "are thinking about the future",
};

function headline(idea: TradeIdea): string {
  const buyer = idea.buyer.short_name ?? idea.buyer.name;
  const name = idea.target.name;
  if (idea.buyerResult.score >= 80) return `The ${buyer} should call about ${name} today`;
  if (idea.buyerResult.score >= 60) return `Why ${name} makes sense for the ${buyer}`;
  return `${name} to the ${buyer}? Tempting, but risky`;
}

const one = (n: number) => n.toFixed(1);

// One trade idea written like a sports-site article: action photo, headline, byline, lede, the deal, the grades, the analysis.
export default async function IdeaPost({
  idea,
  day,
  stats,
  byName,
  featured = false,
}: {
  idea: TradeIdea;
  day?: string; // shown in the byline; omitted for evergreen suggestions
  stats: SeasonStats | undefined;
  byName: Map<string, ValuedPlayer>;
  featured?: boolean;
}) {
  const { buyer, seller, target } = idea;
  const media = target.espnId ? await getAthleteMedia(target.espnId, target.name) : null;
  const short = (t: typeof buyer) => t.short_name ?? t.name;
  const date = day ? new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : null;
  const sides = [
    { team: buyer, result: idea.buyerResult, title: `Why it works for the ${short(buyer)}` },
    { team: seller, result: idea.sellerResult, title: `What the ${short(seller)} get out of it` },
  ];

  const lede = (
    <p className="text-[15px] leading-relaxed text-foreground/90">
      The {short(buyer)} ({buyer.wins}-{buyer.losses}) {MODE_SENTENCE[modeFromRecord(buyer.wins, buyer.losses)]}. The {short(seller)} ({seller.wins}-{seller.losses}){" "}
      {modeFromRecord(seller.wins, seller.losses) === modeFromRecord(buyer.wins, buyer.losses)
        ? "are in the same spot"
        : MODE_SENTENCE[modeFromRecord(seller.wins, seller.losses)]}
      . {target.name}, {target.age},{" "}
      {stats && stats.gp > 0 ? (
        <>
          is averaging {one(stats.pts)} points, {one(stats.orb + stats.drb)} rebounds and {one(stats.ast)} assists
        </>
      ) : (
        <>has a {one(target.gameScore)} Game Score</>
      )}{" "}
      on {formatMoney(target.salary)} this season, for a Trade Value of <b>{target.score}</b>. Here is a deal that fits both payrolls.
    </p>
  );

  const photo = (
    <figure className="min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-2">
        {media ? (
          <Image src={media.image} alt={media.caption} fill sizes={featured ? "(min-width: 1024px) 560px, 100vw" : "(min-width: 1024px) 400px, 100vw"} className="object-cover" />
        ) : (
          <div className="led flex h-full items-center justify-center">
            <PlayerAvatar name={target.name} url={target.headshotUrl} size="lg" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" aria-hidden />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="display rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">Trade idea</span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/70 py-1 pl-1.5 pr-3 backdrop-blur">
          <TeamMark abbreviation={seller.abbreviation} logoUrl={seller.logo_url} />
          <span className="text-xs text-muted" aria-hidden>▸</span>
          <TeamMark abbreviation={buyer.abbreviation} logoUrl={buyer.logo_url} />
          <span className="display text-xs font-bold">{target.name}</span>
        </div>
        <div className="absolute bottom-3 right-3">
          <ScoreBadge score={target.score} size="md" />
        </div>
      </div>
      {media && (
        <figcaption className="mt-1.5 truncate text-[11px] text-muted">
          {media.url ? (
            <a href={media.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              ▶ {media.caption}
            </a>
          ) : (
            media.caption
          )}{" "}
          · ESPN
        </figcaption>
      )}
    </figure>
  );

  const titleBlock = (
    <div className="min-w-0 space-y-3">
      <p className="display text-xs font-bold text-accent">NBA · {day ? "Trade ideas of the day" : "Suggested move"}</p>
      <h3 className={`display font-extrabold leading-[1.05] ${featured ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl"}`}>{headline(idea)}</h3>
      <p className="flex items-center gap-2 text-xs text-muted">
        <span className="led flex h-6 w-6 items-center justify-center rounded bg-accent text-[10px] font-extrabold text-black">TS</span>
        <span>
          <b className="text-foreground">Trade Score Desk</b> {date && `· ${date} `}· 2 min read
        </span>
      </p>
      {lede}
    </div>
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className={featured ? "grid gap-5 lg:grid-cols-[1.15fr_1fr] lg:items-start" : "space-y-4"}>
        {photo}
        {titleBlock}
      </div>

      {/* The deal + grades */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
        {sides.map(({ team, result }) => (
          <div key={team.id} className="min-w-0 rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <TeamMark abbreviation={team.abbreviation} logoUrl={team.logo_url} size="lg" />
              <span className="min-w-0">
                <span className="display block truncate text-base font-extrabold leading-tight">{short(team)}</span>
                <Record wins={team.wins} losses={team.losses} />
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <ScoreBadge score={result.score} size="lg" />
              <span>
                <GradeChip score={result.score} />
                <TierLabel score={result.score} className="block text-xs" />
              </span>
            </div>
            <p className="display mt-3 text-[11px] font-bold text-muted">Gets</p>
            <ul className="mt-0.5 space-y-0.5 text-sm">
              {result.received.map((d) => {
                const p = byName.get(d.label);
                return (
                  <li key={d.label} className="truncate">
                    {p ? (
                      <Link href={`/player/${p.slug}`} className="hover:text-accent">
                        {d.label} <span className="num text-[11px] text-muted">{p.score}</span>
                      </Link>
                    ) : (
                      d.label
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Analysis */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sides.map(({ team, result, title }) => (
          <div key={team.id} className="border-l-2 border-accent pl-3">
            <p className="display text-xs font-bold text-accent">{title}</p>
            <ul className="mt-1 space-y-1 text-sm text-muted">
              {reasonsFor(result).slice(0, 2).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}
