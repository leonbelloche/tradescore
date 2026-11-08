// Share image (1200x630) for a trade: shown when the link is pasted on Discord, X, iMessage...
// Same identity as the site: deep navy, Sora, lowercase logo with a red pen stroke, circled scores.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getScoredTrades } from "@/lib/trades/scored";

export const alt = "Trade Score: who won the trade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const soraBold = readFile(join(process.cwd(), "assets/fonts/Sora-ExtraBold.ttf"));
const soraMedium = readFile(join(process.cwd(), "assets/fonts/Sora-Medium.ttf"));

// Same 5-step scale as the site (app/globals.css), worst -> best.
function scoreColor(score: number): string {
  if (score > 79) return "#2ee6a6";
  if (score > 59) return "#9be15d";
  if (score > 40) return "#ffe14a";
  if (score > 20) return "#ff8a3d";
  return "#ff4d5e";
}

const BG = "#0b1426";
const CARD = "#111d33";
const BORDER = "#22324d";
const MUTED = "#8d9db6";
const PEN = "#ff4545";
const TAGLINE = "Who got robbed? We do the math.";

// "trade score" with the red pen stroke under it.
function Logo({ fontSize }: { fontSize: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex", fontSize, fontWeight: 800, letterSpacing: -fontSize * 0.04 }}>trade score</div>
      <div style={{ display: "flex", width: "100%", height: Math.max(4, fontSize * 0.12), background: PEN, borderRadius: 99, marginTop: 2, transform: "rotate(-1.5deg)" }} />
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = (await getScoredTrades()).find((t) => t.id === id);
  const fonts = [
    { name: "Sora", data: await soraBold, style: "normal" as const, weight: 800 as const },
    { name: "Sora", data: await soraMedium, style: "normal" as const, weight: 500 as const },
  ];

  if (!trade) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: BG, color: "white", alignItems: "center", justifyContent: "center", fontFamily: "Sora", gap: 28 }}>
          <Logo fontSize={110} />
          <div style={{ display: "flex", fontSize: 36, fontWeight: 500, color: MUTED }}>{TAGLINE}</div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const name = (t: (typeof trade.teams)[number]) => t.team.short_name ?? t.team.name;
  const headline = trade.winner ? `${name(trade.winner)} win the trade` : "Even trade";
  const date = new Date(`${trade.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const three = trade.teams.length === 3;
  const circle = three ? 150 : 168;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: BG, color: "#eaf0f7", fontFamily: "Sora", padding: "40px 56px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo fontSize={40} />
          <div style={{ display: "flex", color: MUTED, fontSize: 24, fontWeight: 500 }}>{date}</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 22, fontSize: three ? 56 : 64, fontWeight: 800, letterSpacing: -2 }}>{headline}</div>

        {/* One panel per team */}
        <div style={{ display: "flex", flex: 1, gap: 28, marginTop: 24 }}>
          {trade.teams.map((t) => {
            const color = scoreColor(t.score);
            return (
              <div key={t.team.id} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", background: CARD, borderRadius: 24, border: `2px solid ${BORDER}`, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {t.team.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.team.logo_url} width={56} height={56} alt="" />
                  ) : null}
                  <div style={{ display: "flex", fontSize: three ? 30 : 36, fontWeight: 800, letterSpacing: -1 }}>{name(t)}</div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: circle,
                    height: circle,
                    borderRadius: 999,
                    border: `7px solid ${color}`,
                    color,
                    fontSize: three ? 76 : 86,
                    fontWeight: 800,
                    letterSpacing: -3,
                    marginTop: 16,
                  }}
                >
                  {t.score}
                </div>
                <div style={{ display: "flex", marginTop: 14, fontSize: 28, fontWeight: 800, color }}>{t.tier}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 18, color: MUTED, fontSize: 24, fontWeight: 500 }}>{TAGLINE}</div>
      </div>
    ),
    { ...size, fonts },
  );
}
