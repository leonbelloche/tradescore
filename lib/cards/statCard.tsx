// Post image in the site identity, built to stop the scroll in a feed:
// the team's color as a glow, the player cut out big on the right, one huge title, a colored verdict
// next to the circled score, one line of facts, and the 1-99 scale with a red pen marker where the score falls.
import { ImageResponse } from "next/og";
import { colorFromLogo } from "@/lib/nba/teamColors";
import { BG, Logo, MUTED, PEN, TAGLINE, cardFonts, scoreColor } from "./tradeCard";

export type StatCard = {
  kicker: string; // small red label, e.g. "Trade idea"
  title: string; // the big line: a name, a question
  sub?: string; // colored line next to the score, e.g. "Heist!" or "Fleeced"
  meta?: string[]; // one line of facts, joined with " · "
  big?: number; // circled number (1-99)
  bigLabel?: string; // under the circle, e.g. "Trade Value"
  photo?: string; // player headshot (ESPN cut-out PNG)
  logo?: string; // team logo: sets the color, shown big when there is no photo
  list?: string[]; // ranking lines (shown on the right when there is no number)
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
  const team = colorFromLogo(card.logo);
  const color = card.big !== undefined ? scoreColor(card.big) : "#eaf0f7";
  const meta = (card.meta ?? []).filter(Boolean).slice(0, 3).join("  ·  ");
  const list = (card.list ?? []).slice(0, 5);
  const long = card.title.length;
  const withList = list.length > 0 && card.big === undefined;
  const titleSize = (portrait ? (long > 30 ? 70 : 88) : withList ? (long > 20 ? 62 : 76) : long > 30 ? 58 : long > 20 ? 70 : 88) * k;
  const site = card.site && !card.site.startsWith("localhost") ? card.site : "";
  const inTier = (i: number) => card.big! <= TIERS[i].max && card.big! > (TIERS[i - 1]?.max ?? 0);

  const circle =
    card.big !== undefined ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * k }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 150 * k,
            height: 150 * k,
            borderRadius: 999,
            border: `${8 * k}px solid ${color}`,
            background: "rgba(8,14,28,0.9)",
            color,
            fontSize: 80 * k,
            fontWeight: 800,
            letterSpacing: -4 * k,
          }}
        >
          {card.big}
        </div>
        {card.bigLabel ? <div style={{ display: "flex", fontSize: 18 * k, fontWeight: 800, letterSpacing: 2 * k, color: MUTED }}>{card.bigLabel.toUpperCase()}</div> : null}
      </div>
    ) : null;

  const ranking = list.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 * k, width: portrait ? "100%" : 470 * k }}>
      {list.map((l, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18 * k,
            fontSize: (i === 0 ? 40 : 32) * k,
            fontWeight: i === 0 ? 800 : 500,
            color: i === 0 ? "#ffffff" : "#c3cedd",
            background: i === 0 ? "rgba(255,255,255,0.07)" : "transparent",
            borderRadius: 14 * k,
            padding: `${8 * k}px ${14 * k}px`,
          }}
        >
          <div style={{ display: "flex", width: 40 * k, color: i === 0 ? PEN : MUTED, fontWeight: 800 }}>{i + 1}</div>
          {l}
        </div>
      ))}
    </div>
  ) : null;

  const scale =
    card.big !== undefined ? (
      <div style={{ display: "flex", flexDirection: "column", width: portrait ? "100%" : 640 * k }}>
        <div style={{ display: "flex", position: "relative", height: 28 * k }}>
          <div style={{ display: "flex", position: "absolute", left: `${((card.big - 1) / 98) * 100}%`, top: 2 * k, width: 20 * k, height: 20 * k, marginLeft: -10 * k, background: PEN, transform: "rotate(45deg)" }} />
        </div>
        <div style={{ display: "flex", gap: 8 * k }}>
          {TIERS.map((t, i) => (
            <div key={t.label} style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 * k }}>
              <div style={{ display: "flex", height: 9 * k, borderRadius: 99, background: TIER_COLORS[i], opacity: inTier(i) ? 1 : 0.3 }} />
              <div style={{ display: "flex", fontSize: 17 * k, fontWeight: 800, color: TIER_COLORS[i], opacity: inTier(i) ? 1 : 0.5 }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  // Right side: the player big (bottom-anchored), else the team logo, else the ranking.
  const photoH = (portrait ? 560 : 560) * k;
  const visual = card.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={card.photo}
      width={photoH * 1.37}
      height={photoH}
      style={portrait ? { position: "absolute", right: -60 * k, top: 150 * k } : { position: "absolute", right: -70 * k, bottom: 0 }}
      alt=""
    />
  ) : card.logo && !list.length ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={card.logo} width={400 * k} height={400 * k} style={portrait ? { position: "absolute", right: 60 * k, top: 190 * k } : { position: "absolute", right: 70 * k, top: 140 * k }} alt="" />
  ) : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at ${portrait ? "75% 30%" : "80% 55%"}, ${team}66 0%, ${team}1f 32%, transparent 62%), linear-gradient(160deg, #15294b 0%, ${BG} 60%)`,
          color: "#eaf0f7",
          fontFamily: "Sora",
          padding: `${44 * k}px ${56 * k}px`,
          position: "relative",
        }}
      >
        {/* Faded logo behind the player */}
        {card.photo && card.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.logo} width={520 * k} height={520 * k} style={{ position: "absolute", right: portrait ? 40 * k : 60 * k, top: portrait ? 110 * k : 70 * k, opacity: 0.12 }} alt="" />
        ) : null}
        {visual}
        {/* Darken behind the text so it always reads over the photo */}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: portrait ? "100%" : "62%", background: portrait ? "linear-gradient(0deg, rgba(11,20,38,0.95) 0%, rgba(11,20,38,0.6) 45%, transparent 70%)" : "linear-gradient(90deg, rgba(11,20,38,0.92) 0%, rgba(11,20,38,0.7) 70%, transparent 100%)" }} />

        <div style={{ display: "flex", flexShrink: 0, justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <Logo fontSize={38 * k} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: portrait ? "flex-end" : "center", gap: 14 * k, position: "relative", maxWidth: portrait ? "100%" : list.length && card.big === undefined ? 540 * k : 680 * k }}>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: PEN, color: "#fff", fontSize: 22 * k, fontWeight: 800, letterSpacing: 2 * k, padding: `${6 * k}px ${14 * k}px`, borderRadius: 8 * k }}>{card.kicker.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", flexShrink: 0, fontSize: titleSize, fontWeight: 800, letterSpacing: -3 * k, lineHeight: 1.02 }}>{card.title}</div>
          {circle || card.sub || meta ? (
            <div style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 26 * k, marginTop: 6 * k }}>
              {circle}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 * k, flex: 1 }}>
                {card.sub ? <div style={{ display: "flex", fontSize: 42 * k, fontWeight: 800, color, letterSpacing: -1 * k }}>{card.sub}</div> : null}
                {meta ? <div style={{ display: "flex", fontSize: 26 * k, fontWeight: 500, color: "#c3cedd" }}>{meta}</div> : null}
              </div>
            </div>
          ) : null}
          {portrait && !card.big ? ranking : null}
        </div>

        {!portrait && !card.big && ranking ? <div style={{ display: "flex", position: "absolute", right: 56 * k, top: 120 * k }}>{ranking}</div> : null}

        <div style={{ display: "flex", flexShrink: 0, flexDirection: "column", gap: 14 * k, marginTop: 16 * k, position: "relative" }}>
          {scale}
          <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 20 * k, fontWeight: 500 }}>
            <div style={{ display: "flex" }}>{TAGLINE}</div>
            <div style={{ display: "flex" }}>{site}</div>
          </div>
        </div>
      </div>
    ),
    { width, height, fonts: await cardFonts() },
  );
}
