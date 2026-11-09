// The Instagram Reel of the week, written from the site's data (no Claude needed).
// Three formats take turns week after week: the trade of the week, the top 3 heists, how Trade Score works.
import type { ReelScript } from "@/lib/video/render";
import type { ScoredTrade } from "@/lib/trades/scored";

export type ReelFormat = "trade" | "heists" | "explainer";
export const REEL_FORMATS: { id: ReelFormat; label: string }[] = [
  { id: "trade", label: "Trade of the week" },
  { id: "heists", label: "Top 3 heists" },
  { id: "explainer", label: "How Trade Score works" },
];

// ISO week number + its Monday (YYYY-MM-DD), from a YYYY-MM-DD day.
export function weekOf(day: string): { key: string; monday: string; daysLeft: number } {
  const d = new Date(`${day}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - dow);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - jan1.getTime()) / 86_400_000 + 1) / 7);
  return { key: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, monday: monday.toISOString().slice(0, 10), daysLeft: 6 - dow };
}

export const formatForWeek = (weekKey: string): ReelFormat => REEL_FORMATS[Number(weekKey.slice(-2)) % REEL_FORMATS.length].id;

const short = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;
const HASHTAGS = "#NBA #NBATrades #Basketball #NBATwitter #TradeScore";

export function weeklyReel(format: ReelFormat, trades: ScoredTrade[]): ReelScript {
  const logos: Record<string, string> = {};
  for (const t of trades) for (const x of t.teams) if (x.team.logo_url) logos[short(x.team).toLowerCase()] = x.team.logo_url;
  const outro = { kind: "outro" as const, heading: "Who got robbed? We do the math.", body: "Every NBA trade, graded 1 to 99.", team: "", score: 0 };

  if (format === "trade" && trades[0]) {
    const t = trades[0];
    const [a, b] = t.teams;
    const winner = t.winner;
    return {
      title: `${short(a.team)} vs ${short(b?.team ?? a.team)}: who won?`,
      logos,
      scenes: [
        { kind: "title", heading: "Who won this trade?", body: t.teams.map((x) => short(x.team)).join(" vs "), team: "", score: 0 },
        ...t.teams.slice(0, 3).map((x) => ({ kind: "score" as const, heading: short(x.team), body: x.receives.length ? `Got ${x.receives.slice(0, 2).join(" and ")}` : "Got nothing we can count", team: short(x.team), score: x.score })),
        { kind: "text", heading: winner ? `${short(winner.team)} won it.` : "Dead even.", body: winner ? `${winner.score}/99: ${winner.tier}` : "Both sides got what they paid for.", team: "", score: 0 },
        outro,
      ],
      caption: `Who won the trade? 🧾 ${t.teams.map((x) => `${short(x.team)} ${x.score}`).join(" · ")}. ${winner ? `Our grade says the ${short(winner.team)}.` : "Our grade says it's even."} Agree? Drop your grade below 👇\n\nFull breakdown: link in bio.\n\n${HASHTAGS}`,
    };
  }

  if (format === "heists") {
    const sides = trades.flatMap((trade) => trade.teams.map((x) => ({ trade, x }))).sort((p, q) => q.x.score - p.x.score).slice(0, 3);
    return {
      title: "The 3 biggest heists of the season",
      logos,
      scenes: [
        { kind: "title", heading: "The 3 biggest heists of the season", body: "Graded 1 to 99", team: "", score: 0 },
        ...sides.reverse().map(({ x }, i) => ({ kind: "score" as const, heading: `#${3 - i}`, body: `#${3 - i}: got ${x.receives.slice(0, 2).join(" and ")}`, team: short(x.team), score: x.score })),
        outro,
      ],
      caption: `The 3 biggest heists of the NBA season so far 🚨 ${sides
        .slice()
        .reverse()
        .map(({ x }, i) => `${i + 1}. ${short(x.team)} ${x.score}`)
        .join(" · ")}. Who got robbed the worst? 👇\n\nFull breakdown: link in bio.\n\n${HASHTAGS}`,
    };
  }

  const example = trades.flatMap((trade) => trade.teams.map((x) => ({ trade, x }))).sort((p, q) => q.x.score - p.x.score)[0];
  return {
    title: "How Trade Score works",
    logos,
    scenes: [
      { kind: "title", heading: "Who really won the trade?", body: "Here's how we grade every NBA deal.", team: "", score: 0 },
      { kind: "text", heading: "1. Talent", body: "Each player's stats become one number.", team: "", score: 0 },
      { kind: "text", heading: "2. Price", body: "We compare that talent to his salary and years left.", team: "", score: 0 },
      { kind: "text", heading: "3. Context", body: "Win-now teams value today. Rebuilding teams value the future.", team: "", score: 0 },
      { kind: "text", heading: "4. The grade", body: "What you get minus what you give. 50 is fair. 80+ is a heist.", team: "", score: 0 },
      ...(example ? [{ kind: "score" as const, heading: short(example.x.team), body: `Best trade of the season so far`, team: short(example.x.team), score: example.x.score }] : []),
      outro,
    ],
    caption: `How do you know who won an NBA trade? We do the math 🧮 Talent, salary, years left, team context: one grade from 1 to 99 for every team in every trade. 50 = fair. 80+ = heist.\n\nGrade any trade: link in bio.\n\n${HASHTAGS}`,
  };
}
