"use client";
// Admin forms (client side). Each one calls a Server Action from app/admin/manage.ts and shows its result.
import { useState, useTransition } from "react";
import { addTrade, deleteTrade, refreshNow, saveContract, saveSettings, type ActionResult, type NewTrade } from "@/app/admin/manage";

export const field = "min-h-11 w-full rounded-lg border border-border-strong bg-background px-3 text-sm focus:border-accent";
const primary = "display inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50";
const ghost = "display inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong px-4 text-sm font-bold hover:border-accent disabled:opacity-50";

function Result({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return <p className={`text-sm ${result.ok ? "text-score-5" : "text-score-1"}`} role="status">{result.ok ? "✓ " : "✕ "}{result.message}</p>;
}

// ---------- Refresh ----------
export function RefreshButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} className={primary} onClick={() => start(async () => setResult(await refreshNow()))}>
        {pending ? "Refreshing… (about 1-2 min)" : "↻ Refresh data now"}
      </button>
      <Result result={result} />
    </div>
  );
}

// ---------- Trades ----------
type Team = { abbreviation: string; name: string };
type AssetDraft = NewTrade["assets"][number] & { key: number };
let nextKey = 1;
const blank = (from = "", to = ""): AssetDraft => ({ key: nextKey++, kind: "player", name: "", from, to });

export function TradeForm({ teams, players, prefill }: { teams: Team[]; players: { name: string; team: string }[]; prefill?: { date: string; source: string } }) {
  const [date, setDate] = useState(prefill?.date ?? "");
  const [source, setSource] = useState(prefill?.source ?? "");
  const [assets, setAssets] = useState<AssetDraft[]>([blank(), blank()]);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const update = (key: number, patch: Partial<AssetDraft>) => setAssets((list) => list.map((a) => (a.key === key ? ({ ...a, ...patch } as AssetDraft) : a)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await addTrade({ date, source, assets: assets.map(({ key, ...a }) => (void key, a)) });
      setResult(r);
      if (r.ok) {
        setAssets([blank(), blank()]);
        setSource("");
      }
    });
  }

  const teamSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={field}>
      <option value="">{label}</option>
      {teams.map((t) => (
        <option key={t.abbreviation} value={t.abbreviation}>
          {t.abbreviation} · {t.name}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <datalist id="all-players">
        {players.map((p) => (
          <option key={`${p.name}-${p.team}`} value={p.name}>
            {p.team}
          </option>
        ))}
      </datalist>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <label className="space-y-1">
          <span className="display text-xs font-bold text-muted">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={field} />
        </label>
        <label className="space-y-1">
          <span className="display text-xs font-bold text-muted">ESPN wording (optional, shown on the trade page)</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="CHA: Acquired G Rob Dillingham from Chicago…" className={field} />
        </label>
      </div>

      <div className="space-y-2">
        <p className="display text-xs font-bold text-muted">What moves (one line per player or pick)</p>
        {assets.map((a, i) => (
          <div key={a.key} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-2 sm:grid-cols-[9rem_1fr_9rem_9rem_auto]">
            <select
              value={a.kind}
              onChange={(e) => update(a.key, e.target.value === "player" ? { kind: "player", name: "" } : { kind: e.target.value as "first", year: undefined })}
              aria-label={`Asset ${i + 1} type`}
              className={field}
            >
              <option value="player">Player</option>
              <option value="first">1st-round pick</option>
              <option value="second">2nd-round pick</option>
              <option value="considerations">Draft considerations</option>
            </select>
            {a.kind === "player" ? (
              <input list="all-players" value={a.name} onChange={(e) => update(a.key, { name: e.target.value })} placeholder="Player name" aria-label={`Asset ${i + 1} player`} className={field} />
            ) : a.kind === "considerations" ? (
              <span className="flex items-center text-xs text-muted">Counted as a future 2nd</span>
            ) : (
              <input type="number" min={2026} max={2034} value={a.year ?? ""} onChange={(e) => update(a.key, { year: e.target.value ? Number(e.target.value) : undefined })} placeholder="Year (e.g. 2028)" aria-label={`Asset ${i + 1} year`} className={field} />
            )}
            {teamSelect(a.from, (v) => update(a.key, { from: v }), "From")}
            {teamSelect(a.to, (v) => update(a.key, { to: v }), "To")}
            <button type="button" onClick={() => setAssets((l) => l.filter((x) => x.key !== a.key))} disabled={assets.length <= 2} className={`${ghost} col-span-2 sm:col-span-1`} aria-label={`Remove asset ${i + 1}`}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setAssets((l) => [...l, blank(l.at(-1)?.from, l.at(-1)?.to)])} className={ghost}>
          + Add a player or pick
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Add and grade this trade"}
        </button>
        <Result result={result} />
      </div>
    </form>
  );
}

export function DeleteTradeButton({ slug, label }: { slug: string; label: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={`${ghost} hover:border-score-1 hover:text-score-1`}
        onClick={() => {
          if (confirm(`Delete the trade "${label}"? This cannot be undone.`)) start(async () => setResult(await deleteTrade(slug)));
        }}
      >
        {pending ? "…" : "Delete"}
      </button>
      {result && !result.ok && <Result result={result} />}
    </span>
  );
}

// ---------- Contracts ----------
export function ContractEditor({ playerId, seasons, initial }: { playerId: string; seasons: string[]; initial: Record<string, number> }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(seasons.map((s) => [s, initial[s] ? String(+(initial[s] / 1_000_000).toFixed(3)) : ""])),
  );
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await saveContract(playerId, values)));
      }}
      className="flex flex-wrap items-end gap-2"
    >
      {seasons.map((s) => (
        <label key={s} className="w-20 space-y-0.5">
          <span className="num block text-[10px] text-muted">{s} $M</span>
          <input
            inputMode="decimal"
            value={values[s]}
            onChange={(e) => setValues((v) => ({ ...v, [s]: e.target.value }))}
            placeholder="—"
            className="min-h-10 w-full rounded-lg border border-border-strong bg-background px-2 text-sm focus:border-accent"
          />
        </label>
      ))}
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "…" : "Save"}
      </button>
      <Result result={result} />
    </form>
  );
}

// ---------- Settings ----------
export function SettingsForm({ capMillions, tradeOfTheWeek, trades }: { capMillions: number; tradeOfTheWeek: string; trades: { slug: string; label: string }[] }) {
  const [cap, setCap] = useState(String(capMillions));
  const [totw, setTotw] = useState(tradeOfTheWeek);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await saveSettings({ capMillions: cap, tradeOfTheWeek: totw })));
      }}
      className="space-y-5"
    >
      <label className="block max-w-xs space-y-1">
        <span className="display text-sm font-bold">Salary cap (millions of $)</span>
        <input inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value)} className={field} />
        <span className="block text-xs text-muted">Every Trade Score and Trade Value is computed as a share of the cap.</span>
      </label>
      <label className="block space-y-1">
        <span className="display text-sm font-bold">Trade of the day (home page)</span>
        <select value={totw} onChange={(e) => setTotw(e.target.value)} className={field}>
          <option value="">Automatic (a different trade every day)</option>
          {trades.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        <Result result={result} />
      </div>
    </form>
  );
}
