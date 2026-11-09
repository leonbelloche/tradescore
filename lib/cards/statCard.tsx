// Generic post image in the site identity: a kicker ("BEST VALUE CONTRACTS"), a title, an optional big
// circled number (a Trade Value, a score) with a team logo or player photo, and up to 5 short lines.
import { ImageResponse } from "next/og";
import { BG, BORDER, CARD, Logo, MUTED, PEN, TAGLINE, cardFonts, scoreColor } from "./tradeCard";

export type StatCard = {
  kicker: string;
  title: string;
  big?: number; // circled number (1-99), colored like a score
  bigLabel?: string; // under the number, e.g. "Trade Value"
  photo?: string; // player headshot or team logo URL
  lines?: string[]; // short lines (a ranking, facts)
  site?: string;
};

export async function statCardImage(card: StatCard, { width, height }: { width: number; height: number }) {
  const portrait = height > width;
  const k = portrait ? width / 1000 : width / 1200;
  const color = card.big !== undefined ? scoreColor(card.big) : "#eaf0f7";
  const lines = (card.lines ?? []).slice(0, 5);

  const c = portrait ? 270 : 180; // circle size (smaller in 16:9 so the label fits)
  const visual =
    card.big !== undefined || card.photo ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: (portrait ? 18 : 10) * k }}>
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} width={(portrait ? 300 : 170) * k} height={(portrait ? 220 : 124) * k} style={{ objectFit: "contain" }} alt="" />
        ) : null}
        {card.big !== undefined ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: c * k, height: c * k, borderRadius: 999, border: `${9 * k}px solid ${color}`, color, fontSize: c * 0.5 * k, fontWeight: 800, letterSpacing: -4 * k }}>
            {card.big}
          </div>
        ) : null}
        {card.bigLabel ? <div style={{ display: "flex", fontSize: (portrait ? 34 : 24) * k, fontWeight: 800, color }}>{card.bigLabel}</div> : null}
      </div>
    ) : null;

  const text = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 * k, justifyContent: "center" }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 * k, background: CARD, border: `${2 * k}px solid ${BORDER}`, borderRadius: 18 * k, padding: `${(portrait ? 20 : 14) * k}px ${24 * k}px`, fontSize: (portrait ? 38 : 30) * k, fontWeight: 500 }}>
          {l}
        </div>
      ))}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: BG, color: "#eaf0f7", fontFamily: "Sora", padding: `${44 * k}px ${56 * k}px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo fontSize={40 * k} />
          <div style={{ display: "flex", color: PEN, fontSize: 22 * k, fontWeight: 800, letterSpacing: 3 * k }}>{card.kicker.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", marginTop: 34 * k, fontSize: (card.title.length > 40 ? 52 : 64) * k, fontWeight: 800, letterSpacing: -2 * k, lineHeight: 1.08 }}>{card.title}</div>
        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", flex: 1, gap: 40 * k, alignItems: portrait ? "stretch" : "center", marginTop: 30 * k }}>
          {visual}
          {lines.length ? text : null}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 * k, color: MUTED, fontSize: 24 * k, fontWeight: 500 }}>
          {TAGLINE}
          {card.site ? `  ·  ${card.site}` : ""}
        </div>
      </div>
    ),
    { width, height, fonts: await cardFonts() },
  );
}
