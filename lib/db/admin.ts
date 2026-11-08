// Supabase client with WRITE access (secret key). Server only: SUPABASE_SECRET_KEY has no
// NEXT_PUBLIC_ prefix, so Next.js never sends it to the browser. Only admin code may import this.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function adminDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("SUPABASE_SECRET_KEY is missing (add it to .env.local and to Vercel).");
  client ??= createClient(url, secret, { auth: { persistSession: false } });
  return client;
}

// Throws a readable error when a Supabase call fails.
// `T` = the shape we expect back (Supabase returns untyped rows here).
export async function must<T = unknown>(label: string, promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data as T;
}
