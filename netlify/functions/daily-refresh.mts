// Netlify scheduled function: every morning (11:00 UTC = 6 AM New York), asks the site to refresh its ESPN data.
// Same job as the Vercel cron (vercel.json). The site also refreshes by itself on the first visit after 20 hours.
import type { Config } from "@netlify/functions";

const dailyRefresh = async () => {
  const site = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) return new Response("URL or CRON_SECRET missing", { status: 500 });
  const res = await fetch(`${site}/api/cron/refresh`, { headers: { authorization: `Bearer ${secret}` } });
  return new Response(`refresh: HTTP ${res.status}`, { status: res.ok ? 200 : 502 });
};

export default dailyRefresh;

export const config: Config = { schedule: "0 11 * * *" };
