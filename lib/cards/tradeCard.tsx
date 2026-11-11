// "Trade card" image in the site identity (deep navy, Sora, red pen logo, circled scores).
// Used by the share image of /trade/[id] (1200x630) and by the X studio cards (1600x900, with a punchline).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ScoredTrade } from "@/lib/trades/scored";
import { teamColor } from "@/lib/nba/teamColors";

const soraBold = readFile(join(process.cwd(), "assets/fonts/Sora-ExtraBold.ttf"));
const soraMedium = readFile(join(process.cwd(), "assets/fonts/Sora-Medium.ttf"));

// Same 5-step scale as the site (app/globals.css), worst -> best.
export function scoreColor(score: number): string {
  if (score > 79) return "#2ee6a6";
  if (score > 59) return "#9be15d";
  if (score > 40) return "#ffe14a";
  if (score > 20) return "#ff8a3d";
  return "#ff4d5e";
}

export const BG = "#0b1426";
export const CARD = "#111d33";
export const BORDER = "#22324d";
export const MUTED = "#8d9db6";
export const PEN = "#ff4545";
export const TAGLINE = "Who got robbed? We do the math.";

export function Logo({ fontSize }: { fontSize: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex", fontSize, fontWeight: 800, letterSpacing: -fontSize * 0.04 }}>trade score</div>
      <div style={{ display: "flex", width: "100%", height: Math.max(4, fontSize * 0.12), background: PEN, borderRadius: 99, marginTop: 2, transform: "rotate(-1.5deg)" }} />
    </div>
  );
}

type Options = {
  width: number;
  height: number;
  line?: string; // punchline shown at the bottom (X studio cards)
  detailed?: boolean; // list what each team gets
  site?: string; // domain shown at the bottom
  faces?: Record<string, string>; // team id -> headshot of the best player that team gets
};

export async function cardFonts() {
  return [
    { name: "Sora", data: await soraBold, style: "normal" as const, weight: 800 as const },
    { name: "Sora", data: await soraMedium, style: "normal" as const, weight: 500 as const },
  ];
}

export async function tradeCardImage(trade: ScoredTrade | undefined, { width, height, line, detailed = false, site: siteIn, faces = {} }: Options) {
  const site = siteIn && !siteIn.startsWith("localhost") ? siteIn : undefined;
  const portrait = height > width; // Instagram 4:5: teams stacked instead of side by side
  const k = portrait ? width / 1000 : width / 1200; // designed at 1200 px wide (1000 in portrait), then scaled
  const fonts = await cardFonts();

  if (!trade) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: BG, color: "white", alignItems: "center", justifyContent: "center", fontFamily: "Sora", gap: 28 * k }}>
          <Logo fontSize={110 * k} />
          <div style={{ display: "flex", fontSize: 36 * k, fontWeight: 500, color: MUTED }}>{TAGLINE}</div>
        </div>
      ),
      { width, height, fonts },
    );
  }

  const name = (t: ScoredTrade["teams"][number]) => t.team.short_name ?? t.team.name;
  const headline = trade.winner ? `${name(trade.winner)} win the trade` : "Even trade";
  const date = new Date(`${trade.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const three = trade.teams.length === 3;
  const hasFaces = Object.keys(faces).length > 0;
  const circle = (hasFaces ? (three ? 110 : 128) : three || portrait ? 150 : 168) * k;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: `linear-gradient(160deg, #15294b 0%, ${BG} 55%)`, color: "#eaf0f7", fontFamily: "Sora", padding: `${40 * k}px ${56 * k}px`, position: "relative" }}>
        {/* Winner's logo as a big faded watermark */}
        {(trade.winner ?? trade.teams[0]).team.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(trade.winner ?? trade.teams[0]).team.logo_url!} width={560 * k} height={560 * k} style={{ position: "absolute", right: -80 * k, top: 40 * k, opacity: 0.07 }} alt="" />
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo fontSize={40 * k} />
          <div style={{ display: "flex", color: MUTED, fontSize: 24 * k, fontWeight: 500 }}>{date}</div>
        </div>

        <div style={{ display: "flex", flexShrink: 0, justifyContent: "center", marginTop: 8 * k, fontSize: (three ? 52 : 58) * k, fontWeight: 800, letterSpacing: -2 * k }}>{headline}</div>

        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", flex: 1, gap: 28 * k, marginTop: 24 * k }}>
          {trade.teams.map((t) => {
            const color = scoreColor(t.score);
            const gets = t.receives.join(", ");
            return (
              <div key={t.team.id} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(180deg, ${teamColor(t.team.abbreviation)}33 0%, ${CARD} 55%)`, borderRadius: 24 * k, border: `${2 * k}px solid ${BORDER}`, borderTop: `${6 * k}px solid ${teamColor(t.team.abbreviation)}`, padding: 18 * k }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 * k }}>
                  {t.team.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.team.logo_url} width={56 * k} height={56 * k} alt="" />
                  ) : null}
                  <div style={{ display: "flex", fontSize: (three ? 30 : 36) * k, fontWeight: 800, letterSpacing: -1 * k }}>{name(t)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 * k, marginTop: 6 * k }}>
                  {faces[t.team.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={faces[t.team.id]} width={(three ? 90 : 112) * k * 1.37} height={(three ? 90 : 112) * k} style={{ flexShrink: 0 }} alt="" />
                  ) : null}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    width: circle,
                    height: circle,
                    borderRadius: 999,
                    border: `${7 * k}px solid ${color}`,
                    color,
                    fontSize: (hasFaces ? (three ? 58 : 68) : three ? 76 : 86) * k,
                    fontWeight: 800,
                    letterSpacing: -3 * k,
                  }}
                >
                  {t.score}
                </div>
                </div>
                <div style={{ display: "flex", flexShrink: 0, marginTop: 8 * k, fontSize: 28 * k, fontWeight: 800, color }}>{t.tier}</div>
                {detailed && gets && (
                  <div style={{ display: "flex", marginTop: 4 * k, maxWidth: "92%", textAlign: "center", justifyContent: "center", fontSize: 18 * k, fontWeight: 500, color: MUTED }}>
                    gets {gets.length > (three ? 40 : 46) ? `${gets.slice(0, three ? 37 : 43)}…` : gets}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {line ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 22 * k }}>
            <div style={{ display: "flex", fontSize: 34 * k, fontWeight: 800, letterSpacing: -1 * k, textAlign: "center" }}>{line}</div>
            <div style={{ display: "flex", width: 160 * k, height: 6 * k, background: PEN, borderRadius: 99, marginTop: 8 * k, transform: "rotate(-1.5deg)" }} />
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 * k, color: MUTED, fontSize: 24 * k, fontWeight: 500 }}>
          {TAGLINE}
          {site ? `  ·  ${site}` : ""}
        </div>
      </div>
    ),
    { width, height, fonts },
  );
}
