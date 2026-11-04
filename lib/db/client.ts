import { createClient } from "@supabase/supabase-js";

// Public Supabase client. The publishable key is safe to expose:
// the database only allows READS with it (see supabase/schema.sql).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase settings. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local",
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
