// One bright color per team (from its official palette), used to tint the social images.
// Keys = ESPN abbreviations (same as our teams table and as ESPN's logo file names, lowercased).
export const TEAM_COLORS: Record<string, string> = {
  ATL: "#E03A3E", BOS: "#00A651", BKN: "#9AA0A6", CHA: "#00A3B8", CHI: "#CE1141", CLE: "#A3164D",
  DAL: "#0B6CC4", DEN: "#FEC524", DET: "#E0283E", GS: "#FFC72C", HOU: "#CE1141", IND: "#FDBB30",
  LAC: "#E0283E", LAL: "#8A4FD8", MEM: "#6E8BC9", MIA: "#D0103A", MIL: "#2E8B47", MIN: "#3C8DD6",
  NO: "#C8A962", NY: "#F58426", OKC: "#2A9BE0", ORL: "#1C8CE0", PHI: "#1A7FD4", PHX: "#E56020",
  POR: "#E03A3E", SAC: "#8A55C9", SA: "#C4CED4", TOR: "#E0283E", UTAH: "#8E5BDB", WSH: "#E31837",
};

const FALLBACK = "#3b82f6";

export const teamColor = (abbreviation?: string | null) => (abbreviation && TEAM_COLORS[abbreviation.toUpperCase()]) || FALLBACK;

// ".../teamlogos/nba/500/sa.png" -> team color of SA.
export function colorFromLogo(logo?: string | null): string {
  const m = logo?.match(/\/500\/([a-z]+)\.png/i);
  return teamColor(m?.[1]);
}
