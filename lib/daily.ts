// "Of the day" helpers: things on the site that change every day (trade, team, player of the day...).
import { connection } from "next/server";

const DAY = 86_400_000;

// Today's date in New York (the NBA's day), YYYY-MM-DD, read at request time.
export async function todayEastern(): Promise<string> {
  await connection();
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

// Days since 1970 for a YYYY-MM-DD date: +1 every day.
export const dayNumber = (today: string) => Math.floor(Date.parse(`${today}T12:00:00Z`) / DAY);

// The item of the day: walks through the list one step per day, then starts over.
// `offset` lets two features use the same list without showing the same item.
export function ofTheDay<T>(list: T[], today: string, offset = 0): T | undefined {
  if (list.length === 0) return undefined;
  return list[(dayNumber(today) + offset) % list.length];
}

// "2026-11-11" -> "20261111", shifted by `days`.
export function yyyymmdd(today: string, days = 0): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}
