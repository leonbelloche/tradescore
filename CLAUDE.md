# Projet : TradeLab (nom provisoire) — Simulateur de trades NBA avec Trade Score

## Qui je suis / comment bosser avec moi
- Je m'appelle Léon, j'apprends à coder. Tu es mon coach : explique chaque étape en 2-3 phrases simples, en français.
- Avance étape par étape. À la fin de chaque étape : dis-moi quoi tester et attends ma validation avant la suivante.
- Pas de blabla technique inutile. Si une de mes idées est mauvaise, dis-le.

## Le produit
Site d'analyse des transferts sportifs US. Cœur = simulateur de trades qui donne un **Trade Score /100** à chaque équipe et désigne le gagnant.
- **V1 = NBA uniquement.** NHL, NFL, MLB viendront plus tard → l'architecture doit permettre d'ajouter une ligue sans tout réécrire (une table `leagues`, un moteur de règles par ligue).
- Langue de l'interface : **anglais** (public US), code et commentaires en anglais. (À basculer en FR si je le demande.)
- Pas de monétisation en V1.

## Stack imposée
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres) pour les données
- Déploiement Vercel
- Style : sombre, sportif, moderne, mobile-first

## Pages V1
| Page | Route | Contenu |
|---|---|---|
| Accueil | `/` | Gros bouton "Build a trade", trades populaires, lien vers la méthode |
| Simulateur | `/trade` | Choix de 2 à 3 équipes, ajout/retrait de joueurs, bilan salarial en direct, bouton "Analyze" |
| Résultat | `/trade/[id]` | Score /100 par équipe, gagnant, lien partageable, image OG |
| Fiche joueur | `/player/[slug]` | Stats saison, contrat, âge, valeur estimée |
| Fiche équipe | `/team/[slug]` | Effectif, masse salariale, marge sous le cap |
| Méthode | `/method` | Explication publique du calcul du Trade Score |

## Modèle de données (minimum)
- `leagues` (id, name, salary_cap, rules_json)
- `teams` (id, league_id, name, slug, abbreviation, logo_url)
- `players` (id, team_id, name, slug, position, age, stats_json)
- `contracts` (id, player_id, season, salary) — une ligne par saison restante
- `trades` (id, created_at, teams_json, assets_json, scores_json)

## Règles de validation NBA (V1 simplifiée)
- Salary matching de base : une équipe au-dessus du cap ne peut pas recevoir plus de ~125 % du salaire envoyé (+ petite marge). Mets les seuils dans une config, pas en dur.
- Pas de règles "apron" en V1, pas de choix de draft en V1.
- Afficher clairement pourquoi un trade est invalide.

## Trade Score (V1 — formule finale)
Toutes les valeurs sont en **fraction du salary cap** (0.30 = 30 % du cap). Tous les coefficients dans `lib/score/config.ts`.

### 1. Talent par saison
```
Talent = 0.00488 × max(0, GmSc − 6)^1.56 × Dispo
```
- GmSc = Game Score moyen (Hollinger) : PTS + 0.4·FG − 0.7·FGA − 0.4·(FTA−FT) + 0.7·ORB + 0.3·DRB + STL + 0.7·AST + 0.7·BLK − 0.4·PF − TOV
- Mélange 60 % saison en cours + 40 % saison précédente ; < 10 matchs cette saison → 100 % saison précédente.
- Dispo = matchs joués / matchs possibles (max 1).
- Repères attendus : GmSc 12 → 0.08 · 15 → 0.15 · 20 → 0.30 · 25 → 0.48

### 2. Âge : variation du talent chaque saison suivante
≤22 : +8 % · 23-25 : +4 % · 26-28 : 0 % · 29-30 : −5 % · 31-32 : −10 % · 33+ : −15 %

### 3. Valeur nette joueur (sur son contrat, max 5 saisons)
```
Valeur = Σ_t 0.9^t × (Contexte[mode][t] × Talent_t − Salaire_t / Cap_t)
```
- Cap projeté +7 %/an (configurable). Valeur négative possible (mauvais contrat).

### 4. Contexte de l'équipe qui REÇOIT
Mode auto : win% ≥ .600 → contender, ≤ .400 → rebuild, sinon milieu. Modifiable dans le simulateur.
```
contender: [1.5, 1.2, 1.0, 0.9, 0.8]
milieu:    [1.0, 1.0, 1.0, 1.0, 1.0]
rebuild:   [0.6, 0.8, 1.0, 1.1, 1.1]
```

### 5. Choix de draft
Valeur de base : top3 0.50 · 4-10 0.30 · 11-20 0.15 · 21-30 0.08 · 1er tour futur (≥ 2 ans) 0.18 · 2e tour 0.02
- Rang estimé d'après le classement actuel de l'équipe qui cède le pick.
- Protégé → ×0.7. Pas de swaps en V1.
```
ValeurPick = 0.9^annéesAvantDraft × Base × moyenne(Contexte[mode][y+1..y+4])
```

### 6. Score
```
Score = round(50 + 50 × tanh((Σ reçues − Σ cédées) / 0.25))
```
- Chaque équipe notée séparément (gagnant-gagnant possible). Écart < 5 = "Even trade".
- Trade invalide (salaires) → pas de score.
- **Affichage : seulement le score /100 par équipe.** Le détail (valeur de chaque actif) est quand même retourné par la fonction pour la page Méthode et le debug.

### Tests unitaires obligatoires (résultats attendus de la formule)
| Trade | A | B |
|---|---|---|
| A contender reçoit All-Star 27 ans GmSc 21, 0.30×3 ans ; B rebuild reçoit jeune 22 ans GmSc 13, 0.06×2 ans + 1er tour futur (dans 1 an) | 54 | 92 |
| A milieu reçoit MVP 26 ans GmSc 28, 0.32×4 contre joueur 29 ans GmSc 11, 0.15×2 | 100 | 0 |
| Deux joueurs (GmSc 15, 26 ans, 0.15×3) vs (GmSc 14.5, 25 ans, 0.14×3), milieu | 50 | 50 |
| A contender cède 32 ans GmSc 9, 0.25×2 + pick 4-10 (cette année) à B rebuild contre 28 ans GmSc 11, 0.08×1 | 73 | 31 |

(Ces tests utilisent Dispo = 1 et ignorent la croissance du cap.)

### Précisions (vérifiées : avec elles, les 4 tests donnent exactement les résultats attendus)
- Chaque équipe évalue **tout** (actifs reçus ET cédés) avec **son propre** contexte.
- Pick : `Contexte[mode][y+1..y+4]` avec t indexé à partir de 0 ; si l'index dépasse 4, on reprend la dernière valeur du tableau.
- Un 1er tour qui n'est pas de cette année (dès 1 an) utilise la base « futur » 0.18.
- Les choix de draft SONT dans la V1 (la ligne « pas de choix de draft en V1 » des règles de validation est obsolète).

## Données
- Stats : API gratuite (balldontlie) ou script Python `nba_api` → import dans Supabase.
- Contrats : fichier `data/contracts.csv` rempli à la main au début. Prévois un script d'import.
- Commence avec des **données de démo** (3-4 équipes) pour avancer sans attendre les vraies données.

## Roadmap (une étape = une validation de ma part)
1. Squelette Next.js + Tailwind + pages vides + déploiement Vercel. ✅ si le site tourne en local et en ligne.
2. Supabase + tables + données de démo. ✅ si la fiche équipe affiche effectif + masse salariale.
3. Simulateur. ✅ si un trade trop déséquilibré en salaire est bloqué avec un message clair.
4. Trade Score + page résultat. ✅ si 15/20 trades réels testés donnent le bon gagnant.
5. Partage : lien unique + image OG. ✅ si le lien collé sur Discord/X affiche le score.
6. Vraies données 30 équipes + page Méthode + nom de domaine.

## Commence par
L'étape 1. Explique-moi d'abord en 5 lignes ce que tu vas installer et pourquoi, puis lance.
