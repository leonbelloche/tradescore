// FICTIONAL demo trades between the 4 demo teams, used until real trades are imported.
// Players are referenced by slug, teams by slug. Picks: { pick: { from, round, year, protected? } }.

export type DemoMove =
  | { player: string; from: string; to: string }
  | { pick: { round: 1 | 2; year: number; protected?: boolean }; from: string; to: string };

export type DemoTrade = {
  id: string;
  date: string; // ISO date
  moves: DemoMove[];
};

export const DEMO_TRADES: DemoTrade[] = [
  {
    id: "comets-land-elijah-stone",
    date: "2026-11-03",
    moves: [
      { player: "elijah-stone", from: "red-rock-rattlers", to: "metro-city-comets" },
      { player: "isaiah-grant", from: "metro-city-comets", to: "red-rock-rattlers" },
      { pick: { round: 1, year: 2028 }, from: "metro-city-comets", to: "red-rock-rattlers" },
    ],
  },
  {
    id: "summit-go-all-in-for-okafor",
    date: "2026-11-01",
    moves: [
      { player: "dante-okafor", from: "metro-city-comets", to: "summit-peaks" },
      { player: "chris-dunn", from: "summit-peaks", to: "metro-city-comets" },
      { player: "kyle-barnes", from: "summit-peaks", to: "metro-city-comets" },
    ],
  },
  {
    id: "three-team-guard-swap",
    date: "2026-10-30",
    moves: [
      { player: "jalen-price", from: "metro-city-comets", to: "summit-peaks" },
      { player: "jordan-ellis", from: "summit-peaks", to: "harbor-bay-mariners" },
      { player: "tyrese-holloway", from: "harbor-bay-mariners", to: "metro-city-comets" },
    ],
  },
  {
    id: "rattlers-flip-bianchi",
    date: "2026-10-27",
    moves: [
      { player: "marco-bianchi", from: "red-rock-rattlers", to: "harbor-bay-mariners" },
      { player: "sam-whitfield", from: "harbor-bay-mariners", to: "red-rock-rattlers" },
      { player: "omar-haddad", from: "harbor-bay-mariners", to: "red-rock-rattlers" },
    ],
  },
  {
    id: "comets-pay-to-dump-vasquez",
    date: "2026-10-22",
    moves: [
      { player: "theo-vasquez", from: "metro-city-comets", to: "red-rock-rattlers" },
      { pick: { round: 1, year: 2027 }, from: "metro-city-comets", to: "red-rock-rattlers" },
      { player: "grant-fowler", from: "red-rock-rattlers", to: "metro-city-comets" },
      { player: "isaac-romero", from: "red-rock-rattlers", to: "metro-city-comets" },
    ],
  },
  {
    id: "mariners-swap-carter-for-strand",
    date: "2026-10-18",
    moves: [
      { player: "ben-carter", from: "harbor-bay-mariners", to: "summit-peaks" },
      { player: "felix-strand", from: "summit-peaks", to: "harbor-bay-mariners" },
    ],
  },
];
