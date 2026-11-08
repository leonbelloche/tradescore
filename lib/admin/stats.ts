// Daily counters for the admin dashboard (table daily_stats, see supabase/migrations/003_admin.sql).
import { adminDb } from "@/lib/db/admin";

export type StatKind = "visit" | "signup";
export type DayStats = { day: string; visit: number; signup: number };

// +1 on today's counter. Never throws: a missing table or key must not break the public site.
export async function bump(kind: StatKind): Promise<void> {
  try {
    await adminDb().rpc("bump_stat", { p_kind: kind });
  } catch {}
}

// The last `days` days, oldest first, with zeros for empty days.
// null = not available yet (table not created, or SUPABASE_SECRET_KEY missing): the dashboard shows how to set it up.
export async function lastDays(days: number, today: string): Promise<DayStats[] | null> {
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const from = start.toISOString().slice(0, 10);
  let data: unknown;
  try {
    const res = await adminDb().from("daily_stats").select("day, kind, count").gte("day", from);
    if (res.error) return null;
    data = res.data;
  } catch {
    return null;
  }
  const out: DayStats[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { day: d.toISOString().slice(0, 10), visit: 0, signup: 0 };
  });
  for (const row of data as { day: string; kind: string; count: number }[]) {
    const slot = out.find((o) => o.day === row.day);
    if (slot && (row.kind === "visit" || row.kind === "signup")) slot[row.kind] = row.count;
  }
  return out;
}
