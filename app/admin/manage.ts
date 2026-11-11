"use server";
// Everything the admin can change. Each action checks the admin session first.
import { revalidatePath } from "next/cache";
import { refreshData, saveSite, type RefreshSummary } from "@/lib/admin/refresh";
import { requireAdmin } from "@/lib/admin/session";
import { adminDb, must } from "@/lib/db/admin";
import type { TradeAssetRow } from "@/lib/db/types";

export type ActionResult = { ok: boolean; message: string };

const done = (message: string): ActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, message };
};
const fail = (e: unknown): ActionResult => ({ ok: false, message: e instanceof Error ? e.message : String(e) });

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---------- Data refresh ----------
export async function refreshNow(): Promise<ActionResult & { summary?: RefreshSummary }> {
  await requireAdmin();
  try {
    const summary = await refreshData();
    return { ...done(`Fait en ${summary.seconds} s : ${summary.players} joueurs, ${summary.newPlayers.length} nouveaux, ${summary.moved.length} transferts, ${summary.contractsAdded} contrats ajoutés.`), summary };
  } catch (e) {
    await saveSite({ lastRefreshError: { at: new Date().toISOString(), message: fail(e).message } }).catch(() => {});
    return fail(e);
  }
}

// ---------- Trades ----------
export type NewTrade = {
  date: string; // YYYY-MM-DD
  source: string; // ESPN wording (optional)
  assets: ({ kind: "player"; name: string; from: string; to: string } | { kind: "first" | "second" | "considerations"; year?: number; from: string; to: string })[];
};

export async function addTrade(trade: NewTrade): Promise<ActionResult> {
  await requireAdmin();
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trade.date)) throw new Error("Choisis une date.");
    if (trade.assets.length < 2) throw new Error("Un trade a besoin d'au moins 2 éléments.");
    const db = adminDb();
    const teams = await must<{ abbreviation: string; short_name: string | null; name: string }[]>("teams", db.from("teams").select("abbreviation, short_name, name"));
    const known = new Map(teams.map((t) => [t.abbreviation, t]));
    const players = await must<{ name: string; espn_id: string | null }[]>("players", db.from("players").select("name, espn_id"));
    const espnByName = new Map(players.map((p) => [p.name.toLowerCase(), p.espn_id]));

    const assets: TradeAssetRow[] = trade.assets.map((a, i) => {
      if (!known.has(a.from) || !known.has(a.to)) throw new Error(`Élément ${i + 1} : choisis les deux équipes.`);
      if (a.from === a.to) throw new Error(`Élément ${i + 1} : « De » et « Vers » sont la même équipe.`);
      if (a.kind === "player") {
        const name = a.name.trim();
        if (!name) throw new Error(`Élément ${i + 1} : tape le nom du joueur.`);
        return { name, espn_id: espnByName.get(name.toLowerCase()) ?? null, from: a.from, to: a.to };
      }
      return { pick: a.kind, ...(a.year ? { year: a.year } : {}), from: a.from, to: a.to };
    });
    const abbrs = [...new Set(assets.flatMap((a) => [a.from, a.to]))];
    if (abbrs.length < 2) throw new Error("Un trade a besoin d'au moins 2 équipes.");
    for (const abbr of abbrs) {
      if (!assets.some((a) => a.to === abbr)) throw new Error(`${abbr} receives nothing.`);
    }

    const names = assets.filter((a): a is Extract<TradeAssetRow, { name: string }> => "name" in a).map((a) => a.name.split(" ").slice(-1)[0]);
    let slug = slugify(`${trade.date} ${abbrs.map((a) => known.get(a)!.short_name ?? a).join(" ")} ${names.slice(0, 2).join(" ")}`);
    const taken = await must<{ slug: string }[]>("slugs", db.from("trades").select("slug").like("slug", `${slug}%`));
    if (taken.some((t) => t.slug === slug)) slug = `${slug}-${taken.length + 1}`;

    await must("trade", db.from("trades").insert({ slug, trade_date: trade.date, source_text: trade.source.trim() || null, teams_json: abbrs, assets_json: assets }));
    const unknown = assets.filter((a) => "name" in a && !a.espn_id).map((a) => ("name" in a ? a.name : ""));
    return done(unknown.length ? `Trade ajouté. Pas trouvé dans un effectif (non compté) : ${unknown.join(", ")}. Vérifie l'orthographe.` : "Trade ajouté et noté.");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTrade(slug: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await must("delete", adminDb().from("trades").delete().eq("slug", slug));
    return done("Trade supprimé.");
  } catch (e) {
    return fail(e);
  }
}

// ---------- Contracts ----------
// salaries: season -> millions of dollars (empty = no salary that season).
export async function saveContract(playerId: string, salaries: Record<string, string>): Promise<ActionResult> {
  await requireAdmin();
  try {
    const db = adminDb();
    const rows = Object.entries(salaries)
      .map(([season, m]) => ({ season, millions: Number(String(m).replace(",", ".")) }))
      .filter((r) => String(salaries[r.season]).trim() !== "");
    for (const r of rows) {
      if (!Number.isFinite(r.millions) || r.millions < 0 || r.millions > 100) throw new Error(`${r.season}: type a salary in millions, e.g. 21.5`);
    }
    await must("clear", db.from("contracts").delete().eq("player_id", playerId));
    if (rows.length) {
      await must(
        "save",
        db.from("contracts").insert(rows.map((r) => ({ player_id: playerId, season: r.season, salary: Math.round(r.millions * 1_000_000), source: "manual" }))),
      );
    }
    return done(rows.length ? "Contrat enregistré." : "Contrat supprimé.");
  } catch (e) {
    return fail(e);
  }
}

// ---------- Settings ----------
export async function saveSettings(form: { capMillions: string; tradeOfTheWeek: string }): Promise<ActionResult> {
  await requireAdmin();
  try {
    const cap = Number(form.capMillions.replace(",", "."));
    if (!Number.isFinite(cap) || cap < 50 || cap > 400) throw new Error("Salary cap : tape un nombre en millions, ex. 165.");
    const db = adminDb();
    await must("cap", db.from("leagues").update({ salary_cap: Math.round(cap * 1_000_000) }).eq("id", "nba"));
    await saveSite({ tradeOfTheWeek: form.tradeOfTheWeek || null });
    return done("Réglages enregistrés.");
  } catch (e) {
    return fail(e);
  }
}
