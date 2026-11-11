import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import LoadingBlock from "@/components/LoadingBlock";
import ScoreBadge from "@/components/ScoreBadge";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { getScoredTrades } from "@/lib/trades/scored";
import reference from "@/data/calibration_trades.json";

export const metadata: Metadata = { title: "Calibrage — Admin", robots: { index: false } };

const GOAL = 0.75; // 15 out of 20

type Ref = { slug: string; analystWinner: string; confidence?: string; source?: string };

export default function AdminCalibrationPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Calibration />
    </Suspense>
  );
}

async function Calibration() {
  await requireAdmin();
  const trades = new Map((await getScoredTrades()).map((t) => [t.id, t]));
  const rows = (reference as Ref[]).map((r) => {
    const t = trades.get(r.slug);
    const predicted = t ? (t.winner ? t.winner.team.abbreviation : "even") : null;
    return { ...r, trade: t, predicted, hit: predicted !== null && predicted.toLowerCase() === r.analystWinner.toLowerCase() };
  });
  const hits = rows.filter((r) => r.hit).length;
  const rate = rows.length ? hits / rows.length : 0;

  return (
    <div className="space-y-8">
      <AdminHeader title="Calibrage" sub="Est-ce que notre Trade Score désigne le même gagnant que les analystes (ESPN, SI, Yahoo…) ?" />

      <Card className="flex flex-wrap items-center gap-6 p-5">
        <div>
          <p className="display text-[11px] font-bold text-muted">Même gagnant que les analystes</p>
          <p className={`display text-5xl font-extrabold tabular-nums ${rate >= GOAL ? "text-score-5" : rate >= 0.5 ? "text-score-3" : "text-score-1"}`}>
            {hits}/{rows.length}
          </p>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <div className="relative h-3 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent" style={{ width: `${rate * 100}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${GOAL * 100}%` }} title="Objectif" />
          </div>
          <p className="text-xs text-muted">
            {Math.round(rate * 100)} % · objectif {GOAL * 100} % (15 sur 20). Pour l&apos;améliorer, les réglages de la formule sont dans lib/score/config.ts : demande à Claude d&apos;essayer des changements, puis recharge cette page.
          </p>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="display border-b border-border text-left text-[11px] font-bold text-muted">
            <tr>
              <th className="px-4 py-3">Trade</th>
              <th className="px-2 py-3">Nos scores</th>
              <th className="px-2 py-3">Notre gagnant</th>
              <th className="px-2 py-3">Analystes</th>
              <th className="px-4 py-3 text-right">Pareil ?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b border-border/60 last:border-0 align-top">
                <td className="px-4 py-3">
                  {r.trade ? (
                    <Link href={`/trade/${r.slug}`} className="hover:text-accent">
                      {r.trade.date} · {r.trade.teams.map((x) => x.team.short_name ?? x.team.name).join(" · ")}
                    </Link>
                  ) : (
                    <span className="text-score-1">{r.slug} (pas sur le site)</span>
                  )}
                  {r.source && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.source}</p>}
                </td>
                <td className="px-2 py-3">
                  <span className="flex gap-1.5">
                    {r.trade?.teams.map((x) => (
                      <span key={x.team.id} className="inline-flex items-center gap-1">
                        <span className="num text-[11px] text-muted">{x.team.abbreviation}</span>
                        <ScoreBadge score={x.score} />
                      </span>
                    ))}
                  </span>
                </td>
                <td className="display px-2 py-3 font-bold">{r.predicted ?? "—"}</td>
                <td className="display px-2 py-3 font-bold">
                  {r.analystWinner}
                  {r.confidence && <span className="ml-1 text-[10px] font-normal text-muted">({r.confidence})</span>}
                </td>
                <td className={`px-4 py-3 text-right text-lg ${r.hit ? "text-score-5" : "text-score-1"}`}>{r.hit ? "✓" : "✕"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted">Verdicts de référence : data/calibration_trades.json (tirés des notes de trades publiées).</p>
    </div>
  );
}
