// What was already published from the admin (table social_posts, supabase/migrations/004_social.sql).
import { adminDb } from "@/lib/db/admin";

export type Published = { url: string | null; at: string };

// Posts published on `day`, by id. Empty when the table or the secret key is missing.
export async function publishedOn(day: string): Promise<Record<string, Published>> {
  try {
    const { data, error } = await adminDb().from("social_posts").select("id, remote_url, posted_at").eq("day", day);
    if (error || !data) return {};
    return Object.fromEntries((data as { id: string; remote_url: string | null; posted_at: string }[]).map((r) => [r.id, { url: r.remote_url, at: r.posted_at }]));
  } catch {
    return {};
  }
}

export async function recordPublished(row: { id: string; channel: string; day: string; text: string; image: string; remote_id: string; remote_url: string }): Promise<boolean> {
  try {
    const { error } = await adminDb().from("social_posts").upsert(row);
    return !error;
  } catch {
    return false;
  }
}

// How many posts a channel published since `day` (YYYY-MM-DD). 0 when the table is missing.
export async function countSince(channel: string, day: string): Promise<number> {
  try {
    const { count, error } = await adminDb().from("social_posts").select("id", { count: "exact", head: true }).eq("channel", channel).gte("day", day);
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

// When the channel last published (ISO), or null. Used to space out posts on X.
export async function lastPublishedAt(channel: string): Promise<string | null> {
  try {
    const { data } = await adminDb().from("social_posts").select("posted_at").eq("channel", channel).order("posted_at", { ascending: false }).limit(1).maybeSingle();
    return (data as { posted_at?: string } | null)?.posted_at ?? null;
  } catch {
    return null;
  }
}

export async function alreadyPublished(id: string): Promise<boolean> {
  try {
    const { data } = await adminDb().from("social_posts").select("id").eq("id", id).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
