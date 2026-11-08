// NBA games of one day, from ESPN's public scoreboard (refreshed every few minutes).
import { cacheLife } from "next/cache";

export type GameTeam = {
  abbreviation: string; // same as our teams table (ESPN abbreviations)
  name: string;
  logo: string | null;
  score: number | null; // null before tip-off
  winner: boolean;
  record: string | null; // "5-3"
};

export type Game = {
  id: string;
  start: string; // ISO date-time
  state: "pre" | "in" | "post";
  detail: string; // "Final", "Q3 5:12", "7:30 PM ET"
  away: GameTeam;
  home: GameTeam;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  winner?: boolean;
  team: { abbreviation: string; displayName: string; logo?: string };
  records?: { summary: string }[];
};
type EspnEvent = {
  id: string;
  date: string;
  status: { type: { state: "pre" | "in" | "post"; shortDetail: string } };
  competitions: { competitors: EspnCompetitor[] }[];
};

const toTeam = (c: EspnCompetitor, state: Game["state"]): GameTeam => ({
  abbreviation: c.team.abbreviation,
  name: c.team.displayName,
  logo: c.team.logo ?? null,
  score: state === "pre" || c.score === undefined ? null : Number(c.score),
  winner: c.winner === true,
  record: c.records?.[0]?.summary ?? null,
});

// `day` = "YYYYMMDD"; without it ESPN returns the current game day.
export async function getScoreboard(day?: string): Promise<{ day: string; games: Game[] }> {
  "use cache";
  cacheLife("minutes");
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard${day ? `?dates=${day}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN scoreboard: HTTP ${res.status}`);
  const json = (await res.json()) as { day?: { date: string }; events?: EspnEvent[] };
  const games = (json.events ?? []).map((e): Game => {
    const state = e.status.type.state;
    const comps = e.competitions[0].competitors;
    return {
      id: e.id,
      start: e.date,
      state,
      detail: e.status.type.shortDetail,
      away: toTeam(comps.find((c) => c.homeAway === "away")!, state),
      home: toTeam(comps.find((c) => c.homeAway === "home")!, state),
    };
  });
  // ESPN gives the day only when no date is asked; otherwise it is the one we asked for.
  const iso = json.day?.date ?? (day ? `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}` : new Date().toISOString().slice(0, 10));
  return { day: iso, games };
}

// "2026-11-07" -> "20261107", shifted by `days`.
export function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}
