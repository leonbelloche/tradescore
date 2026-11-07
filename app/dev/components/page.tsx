import type { Metadata } from "next";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import ResultCard, { TradeErrors } from "@/components/trades/ResultCard";
import { Badge, Button, Card, SectionTitle, TeamMark } from "@/components/ui";
import { TIERS } from "@/lib/score";
import { MOCK_RESULTS, MOCK_TEAMS } from "@/lib/score/__mocks__/scoreTrade.mock";

export const metadata: Metadata = { title: "Components — Trade Score", robots: { index: false } };

// Showcase of every UI component in every state, with MOCK data only.
export default function ComponentsPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="display text-4xl font-bold">Components</h1>
        <p className="text-sm text-muted">Dev showcase · MOCK data (lib/score/__mocks__/scoreTrade.mock.ts)</p>
      </header>

      <section>
        <SectionTitle title="Buttons" />
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button href="/trade">Link button ▸</Button>
        </div>
      </section>

      <section>
        <SectionTitle title="Verdicts" />
        <div className="flex flex-wrap gap-3">
          <Badge verdict="Win" />
          <Badge verdict="Loss" />
          <Badge verdict="Even" />
        </div>
      </section>

      <section>
        <SectionTitle title="Scores and tiers" />
        <div className="flex flex-wrap items-center gap-4">
          {TIERS.map((t) => (
            <span key={t.label} className="flex items-center gap-2">
              <ScoreBadge score={t.max} /> <ScoreBadge score={t.max} size="md" /> <ScoreBadge score={t.max} size="lg" />
              <TierLabel score={t.max} />
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Team marks" />
        <div className="flex items-center gap-3">
          <TeamMark abbreviation="MET" />
          <TeamMark abbreviation="MET" size="lg" />
          <TeamMark abbreviation="LAL" logoUrl="https://a.espncdn.com/i/teamlogos/nba/500/lal.png" />
          <TeamMark abbreviation="LAL" logoUrl="https://a.espncdn.com/i/teamlogos/nba/500/lal.png" size="lg" />
        </div>
      </section>

      <section>
        <SectionTitle title="Card" />
        <Card className="p-4 text-sm">A card with some content. Long names must not break the layout: Giannis Antetokounmpo.</Card>
      </section>

      {MOCK_RESULTS.map(({ title, result }) => (
        <section key={title}>
          <SectionTitle title={`Result · ${title}`} />
          {result.valid ? (
            <div className={`grid gap-3 ${result.teams.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
              {result.teams.map((t) => (
                <ResultCard key={t.teamId} team={MOCK_TEAMS[t.teamId]} result={t} showSent />
              ))}
            </div>
          ) : (
            <TradeErrors errors={result.errors} />
          )}
        </section>
      ))}
    </div>
  );
}
