// Share image (1200x630) for a trade: shown when the link is pasted on Discord, X, iMessage...
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getScoredTrades } from "@/lib/trades/scored";

export const alt = "Trade Score: who won the trade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const shoulders = readFile(join(process.cwd(), "assets/fonts/BigShoulders-ExtraBold.ttf"));

// Same 5-step scale as the site (app/globals.css), worst -> best.
function scoreColor(score: number): string {
  if (score > 79) return "#2ee6a6";
  if (score > 59) return "#9be15d";
  if (score > 40) return "#b8c4d6";
  if (score > 20) return "#ff8a3d";
  return "#ff4d5e";
}

const BG = "#0b0c10";
const CARD = "#14161c";
const MUTED = "#9aa1b0";
const ACCENT = "#ffb020";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = (await getScoredTrades()).find((t) => t.id === id);
  const fonts = [{ name: "BigShoulders", data: await shoulders, style: "normal" as const, weight: 800 as const }];

  if (!trade) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: BG, color: "white", alignItems: "center", justifyContent: "center", fontFamily: "BigShoulders", fontSize: 96 }}>
          TRADE <span style={{ color: ACCENT, marginLeft: 24 }}>SCORE</span>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const name = (t: (typeof trade.teams)[number]) => (t.team.short_name ?? t.team.name).toUpperCase();
  const headline = trade.winner ? `${name(trade.winner)} WIN THE TRADE` : "EVEN TRADE";
  const date = new Date(`${trade.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const three = trade.teams.length === 3;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: BG, color: "white", fontFamily: "BigShoulders", padding: "40px 56px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 36, letterSpacing: 2 }}>
          <div style={{ display: "flex" }}>
            TRADE<span style={{ display: "flex", background: ACCENT, color: "#000", marginLeft: 10, padding: "0 10px", borderRadius: 6 }}>SCORE</span>
          </div>
          <div style={{ display: "flex", color: MUTED, fontSize: 28 }}>{date.toUpperCase()}</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18, fontSize: three ? 54 : 62, color: trade.winner ? ACCENT : "white", letterSpacing: 1 }}>
          {headline}
        </div>

        {/* One panel per team */}
        <div style={{ display: "flex", flex: 1, gap: 28, marginTop: 26 }}>
          {trade.teams.map((t) => (
            <div key={t.team.id} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", background: CARD, borderRadius: 24, border: "2px solid #242833", padding: 20 }}>
              {t.team.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.team.logo_url} width={three ? 72 : 84} height={three ? 72 : 84} alt="" />
              ) : null}
              <div style={{ display: "flex", fontSize: three ? 32 : 38, lineHeight: 1.2, marginTop: 6 }}>{name(t)}</div>
              {/* Fixed-height box: tall display digits are tall and would overlap the lines around them. */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: three ? 120 : 132, fontSize: three ? 92 : 98, lineHeight: 1.3, color: scoreColor(t.score) }}>
                {t.score}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, lineHeight: 1.3 }}>
                <span style={{ display: "flex", border: `3px solid ${t.verdict === "Win" ? "#2ee6a6" : t.verdict === "Loss" ? "#ff4d5e" : MUTED}`, color: t.verdict === "Win" ? "#2ee6a6" : t.verdict === "Loss" ? "#ff4d5e" : MUTED, borderRadius: 8, padding: "0 12px" }}>
                  {t.verdict.toUpperCase()}
                </span>
                <span style={{ display: "flex", color: scoreColor(t.score) }}>{t.tier.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 20, color: MUTED, fontSize: 24, letterSpacing: 1 }}>
          EVERY NBA TRADE SCORED OUT OF 100
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
