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

export async function alreadyPublished(id: string): Promise<boolean> {
  try {
    const { data } = await adminDb().from("social_posts").select("id").eq("id", id).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
