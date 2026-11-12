// X profile images in the site identity: /api/brand/avatar (400x400) and /api/brand/banner (1500x500).
import { ImageResponse } from "next/og";
import { BG, MUTED, PEN, TAGLINE, cardFonts } from "@/lib/cards/tradeCard";

const TIERS = [
  { label: "Fleeced", color: "#ff4d5e" },
  { label: "Lost It", color: "#ff8a3d" },
  { label: "Fair Deal", color: "#ffe14a" },
  { label: "Won It", color: "#9be15d" },
  { label: "Heist!", color: "#2ee6a6" },
];

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const fonts = await cardFonts();

  if (kind === "avatar") {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle at 50% 40%, #1b335c 0%, ${BG} 70%)`, fontFamily: "Sora" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 190, fontWeight: 800, color: "#eaf0f7", letterSpacing: -10, lineHeight: 1 }}>ts</div>
            <div style={{ display: "flex", width: 190, height: 18, background: PEN, borderRadius: 99, marginTop: 6, transform: "rotate(-3deg)" }} />
          </div>
        </div>
      ),
      { width: 400, height: 400, fonts },
    );
  }

  if (kind === "banner") {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: `linear-gradient(160deg, #15294b 0%, ${BG} 60%)`, fontFamily: "Sora", color: "#eaf0f7", padding: "0 90px", alignItems: "center", justifyContent: "flex-end" }}>
          {/* Left ~400px stays empty: the profile photo covers it on X */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -4 }}>trade score</div>
              <div style={{ display: "flex", width: 470, height: 12, background: PEN, borderRadius: 99, marginTop: 2, transform: "rotate(-1.5deg)" }} />
            </div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{TAGLINE}</div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: MUTED }}>Every NBA trade, graded 1 to 99.</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {TIERS.map((t) => (
                <div key={t.label} style={{ display: "flex", flexDirection: "column", gap: 6, width: 120 }}>
                  <div style={{ display: "flex", height: 10, borderRadius: 99, background: t.color }} />
                  <div style={{ display: "flex", fontSize: 18, fontWeight: 800, color: t.color }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      { width: 1500, height: 500, fonts },
    );
  }

  return new Response("Unknown image", { status: 404 });
}
