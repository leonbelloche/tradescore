// Post image in the site identity, built to read at a glance in a feed:
// one big title, a colored verdict, one line of facts, a big circled score, the team logo as a watermark,
// and the 1-99 scale with a red pen marker where the score falls.
import { ImageResponse } from "next/og";
import { BG, Logo, MUTED, PEN, TAGLINE, cardFonts, scoreColor } from "./tradeCard";

export type StatCard = {
  kicker: string; // small label top right, e.g. "Best value contracts"
  title: string; // the big line: a name, a question
  sub?: string; // colored line under the title, e.g. "Heist!" or "Fleeced"
  meta?: string[]; // one line of facts, joined with " · "
  big?: number; // circled number (1-99)
  bigLabel?: string; // under the circle, e.g. "Trade Value"
  photo?: string; // player headshot
  logo?: string; // team logo, shown as a big faded watermark
  list?: string[]; // ranking lines (shown instead of the circle when there is no number)
  site?: string;
};

const TIERS = [
  { label: "Fleeced", max: 20 },
  { label: "Lost It", max: 40 },
  { label: "Fair Deal", max: 59 },
  { label: "Won It", max: 79 },
  { label: "Heist!", max: 99 },
];
const TIER_COLORS = ["#ff4d5e", "#ff8a3d", "#ffe14a", "#9be15d", "#2ee6a6"];

export async function statCardImage(card: StatCard, { width, height }: { width: number; height: number }) {
  const portrait = height > width;
  const k = portrait ? width / 1000 : width / 1200;
  const color = card.big !== undefined ? scoreColor(card.big) : "#eaf0f7";
  const meta = (card.meta ?? []).filter(Boolean).slice(0, 3).join("  ·  ");
  const list = (card.list ?? []).slice(0, 5);
  const titleSize = (card.title.length > 34 ? 64 : card.title.length > 22 ? 80 : 96) * k;

  const circle =
    card.big !== undefined ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * k }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 250 * k,
            height: 250 * k,
            borderRadius: 999,
            border: `${11 * k}px solid ${color}`,
            background: "rgba(11,20,38,0.85)",
            color,
            fontSize: 128 * k,
            fontWeight: 800,
            letterSpacing: -5 * k,
          }}
        >
          {card.big}
        </div>
        {card.bigLabel ? <div style={{ display: "flex", fontSize: 24 * k, fontWeight: 800, letterSpacing: 3 * k, color: MUTED }}>{card.bigLabel.toUpperCase()}</div> : null}
      </div>
    ) : null;

  const ranking = list.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 * k, width: portrait ? "100%" : 520 * k }}>
      {list.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 * k, fontSize: 34 * k, fontWeight: i === 0 ? 800 : 500, color: i === 0 ? "#eaf0f7" : "#c3cedd", borderBottom: `${2 * k}px solid #22324d`, paddingBottom: 10 * k }}>
          <div style={{ display: "flex", width: 44 * k, color: i === 0 ? PEN : MUTED, fontWeight: 800 }}>{i + 1}</div>
          {l}
        </div>
      ))}
    </div>
  ) : null;

  // 1-99 scale with a red pen marker at the score
  const scale =
    card.big !== undefined ? (
      <div style={{ display: "flex", flexDirection: "column", marginTop: 26 * k }}>
        <div style={{ display: "flex", position: "relative", height: 34 * k }}>
          <div style={{ display: "flex", position: "absolute", left: `${((card.big - 1) / 98) * 100}%`, top: 4 * k, width: 22 * k, height: 22 * k, marginLeft: -11 * k, background: PEN, transform: "rotate(45deg)" }} />
        </div>
        <div style={{ display: "flex", gap: 10 * k }}>
          {TIERS.map((t, i) => (
            <div key={t.label} style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 * k }}>
              <div style={{ display: "flex", height: 10 * k, borderRadius: 99, background: TIER_COLORS[i], opacity: card.big! <= t.max && card.big! > (TIERS[i - 1]?.max ?? 0) ? 1 : 0.35 }} />
              <div style={{ display: "flex", fontSize: 20 * k, fontWeight: 800, color: TIER_COLORS[i], opacity: card.big! <= t.max && card.big! > (TIERS[i - 1]?.max ?? 0) ? 1 : 0.55 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: `linear-gradient(160deg, #15294b 0%, ${BG} 55%)`, color: "#eaf0f7", fontFamily: "Sora", padding: `${48 * k}px ${60 * k}px`, position: "relative" }}>
        {card.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.logo} width={620 * k} height={620 * k} style={{ position: "absolute", right: -90 * k, top: portrait ? 300 * k : 80 * k, opacity: 0.09 }} alt="" />
        ) : null}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo fontSize={42 * k} />
          <div style={{ display: "flex", color: MUTED, fontSize: 24 * k, fontWeight: 800, letterSpacing: 3 * k }}>{card.kicker.toUpperCase()}</div>
        </div>

        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", flex: 1, alignItems: portrait ? "flex-start" : "center", justifyContent: "space-between", gap: 36 * k, marginTop: 24 * k }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 * k }}>
            {card.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.photo} width={230 * k} height={168 * k} style={{ objectFit: "contain", objectPosition: "left bottom" }} alt="" />
            ) : null}
            <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, letterSpacing: -3 * k, lineHeight: 1.02 }}>{card.title}</div>
            {card.sub ? <div style={{ display: "flex", fontSize: 44 * k, fontWeight: 800, color }}>{card.sub}</div> : null}
            {meta ? <div style={{ display: "flex", fontSize: 28 * k, fontWeight: 500, color: "#c3cedd" }}>{meta}</div> : null}
          </div>
          {circle}
          {!circle && ranking}
        </div>

        {scale}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 * k, color: MUTED, fontSize: 22 * k, fontWeight: 500 }}>
          <div style={{ display: "flex" }}>{TAGLINE}</div>
          <div style={{ display: "flex" }}>{card.site ?? ""}</div>
        </div>
      </div>
    ),
    { width, height, fonts: await cardFonts() },
  );
}
