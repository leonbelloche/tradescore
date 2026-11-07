"use client";

import { useState } from "react";

// Two tabs: Trade Score ranking / classic NBA standings. Panels are rendered on the server.
export default function RankingTabs({ tradeScore, standings }: { tradeScore: React.ReactNode; standings: React.ReactNode }) {
  const [tab, setTab] = useState<"trade" | "nba">("trade");
  const tabs = [
    { id: "trade" as const, label: "Trade Score" },
    { id: "nba" as const, label: "NBA standings" },
  ];
  return (
    <div className="space-y-8">
      <div role="tablist" aria-label="Rankings" className="inline-flex rounded-xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`display min-h-11 rounded-lg px-4 text-sm font-bold transition ${
              tab === t.id ? "bg-accent text-black" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-trade" aria-labelledby="tab-trade" hidden={tab !== "trade"}>
        {tradeScore}
      </div>
      <div role="tabpanel" id="panel-nba" aria-labelledby="tab-nba" hidden={tab !== "nba"}>
        {standings}
      </div>
    </div>
  );
}
