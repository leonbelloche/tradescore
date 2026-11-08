"use server";

import { bump } from "@/lib/admin/stats";

// Called by the browser: once per day for a visit, once per sign-up. Only a +1 is stored.
export async function trackVisit() {
  await bump("visit");
}

export async function trackSignup() {
  await bump("signup");
}
