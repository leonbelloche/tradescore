# Contrat SCORE ↔ DESIGN

Adapté le 2026-11-07 du plan "tradelab-semaines" au projet réel (voir "Écarts avec le plan d'origine").

## Qui possède quoi
| Zone | Propriétaire | L'autre agent |
|---|---|---|
| `lib/score/**`, `lib/rules/**`, `scripts/calibration/**` | SCORE | lecture seule, import uniquement |
| `app/**`, `components/**`, styles | DESIGN | n'y touche pas |
| `lib/score/types.ts` | SCORE | importe, ne modifie jamais |
| `lib/db/**`, `lib/trades/**`, `scripts/*.mjs`, `data/**` | données (Léon / agent principal) | lecture seule |

## Point d'entrée unique pour DESIGN
DESIGN importe UNIQUEMENT depuis `lib/score/index.ts` :
- `scoreTrade(trade: Trade): TradeResult`
- `validateTrade(trade: Trade): ValidationResult` (implémenté dans `lib/rules/nba.ts`)
- `TIERS`, `tierFor(score)` (affichage des paliers)
- les types ci-dessous

## Types (source : `lib/score/types.ts`)
```ts
export type League = "NBA"; // NHL | NFL | MLB plus tard
export type TeamMode = "contender" | "middle" | "rebuild";

// Les actifs arrivent DÉJÀ résolus (données du joueur / du pick) : le calcul reste pur, sans base de données.
export type PlayerAsset = { kind: "player"; id: string; name: string; age: number;
  gameScore: number; availability: number; salaries: number[] /* fractions du cap, saison 0 d'abord */ };
export type PickAsset = { kind: "pick"; id: string; name: string; round: 1 | 2;
  yearsUntilDraft: number; projectedSlot?: number; protected?: boolean };
export type Asset = PlayerAsset | PickAsset;

export type TradeLeg = { fromTeamId: string; toTeamId: string; asset: Asset };
export type TradeTeam = { id: string; abbreviation: string; mode: TeamMode; payroll: number /* $ */ };

export type Trade = {
  league: League;
  salaryCap: number;                 // $ de la saison en cours
  rules?: Record<string, unknown>;   // leagues.rules_json (seuils de salary matching)
  teams: TradeTeam[];
  legs: TradeLeg[];
  skipValidation?: boolean;          // vrais trades passés (exceptions de la CBA) : on note sans valider
};

export type AssetDetail = {
  asset: Asset;
  label: string;                     // ex. "2027 1st (prot.) · LAL"
  value: number;                     // valeur nette pour l'équipe qui l'évalue
  breakdown: Record<string, number>; // étapes du calcul, pour la page Méthode
};

export type Verdict = "Win" | "Loss" | "Even";

export type TeamResult = {
  teamId: string;
  score: number;                     // 0-100, entier
  verdict: Verdict;                  // Even si trade équilibré, sinon Win (>50) / Loss (<50) — gagnant-gagnant possible
  tier: string;                      // Fleeced / Lost It / Fair Deal / Won It / Heist!
  mode: TeamMode;
  received: AssetDetail[];
  sent: AssetDetail[];
  details: Record<string, number>;   // receivedTotal, sentTotal, net
};

export type SalaryCheck = { teamId: string; outgoing: number; incoming: number; payrollAfter: number;
  overCapAfter: boolean; maxIncoming: number | null; ok: boolean; message: string }; // $

export type ValidationResult =
  | { valid: true; checks: SalaryCheck[] }
  | { valid: false; errors: string[]; checks: SalaryCheck[] }; // messages en anglais

export type TradeResult =
  | { valid: true; teams: TeamResult[]; winnerTeamId: string | null; isEven: boolean }
  | { valid: false; errors: string[]; teams: [] }; // trade invalide = pas de score
```

## Écarts avec le plan d'origine (validés par Léon le 2026-11-07)
- `Asset` contient les données résolues (pas seulement un id) : sinon `scoreTrade` devrait lire la base.
- `Trade` porte `salaryCap`, `rules`, le `mode` et la `payroll` de chaque équipe : nécessaires à la validation et au contexte.
- `skipValidation` : les vrais trades passés utilisent des exceptions (TPE, etc.) que nos règles simplifiées ne connaissent pas.
- `ValidationResult.checks` : le détail par équipe pour la barre salariale en direct.
- `TeamResult.tier` et `mode` en plus du verdict.
- Tests de référence = formule calibrée le 2026-11-12 (96/39, 99/1, 49/51, 25/85), voir CLAUDE.md.
- Design : style WageScore (Oswald + Roboto, échelle 5 couleurs), pas le thème Space Grotesk/Inter du plan design semaine 1.

## Règles de changement
- Un changement de type = SCORE le propose, Léon valide, puis SCORE met à jour `types.ts` ET ce fichier.
- DESIGN ne contourne jamais un type manquant avec `any` : il demande à Léon.
- Données factices pour DESIGN : `lib/score/__mocks__/scoreTrade.mock.ts` (mêmes types).
