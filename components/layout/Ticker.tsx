import Link from "next/link";
import { scoreTone } from "@/components/ScoreBadge";
import { getScoredTrades } from "@/lib/trades/scored";

// Scrolling scoreboard of the latest trades: "PHI 75 · 25 BOS".
export default async function Ticker() {
  const trades = await getScoredTrades();
  if (trades.length === 0) return null;
  const items = trades.slice(0, 12);

  const row = (key: string) => (
    <ul className="flex shrink-0 items-center" aria-hidden={key === "b"}>
      {items.map((t) => (
        <li key={`${key}-${t.id}`} className="flex items-center">
          <Link href={`/trade/${t.id}`} tabIndex={key === "b" ? -1 : undefined} className="display flex items-center gap-2 px-4 text-sm font-bold hover:text-accent">
            {t.teams.map((x, i) => (
              <span key={x.team.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted">·</span>}
                <span>{x.team.abbreviation}</span>
                <span className={scoreTone(x.score).text}>{x.score}</span>
              </span>
            ))}
          </Link>
          <span className="h-3 w-px bg-border-strong" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="ticker flex overflow-hidden border-b border-border bg-black py-1.5">
      <span className="display z-10 flex shrink-0 items-center gap-1.5 bg-accent px-3 text-xs font-extrabold text-black">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" /> Live
      </span>
      <div className="ticker-track flex w-max">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
