// Shared helpers for the data scripts (plain Node, no build step).
import { existsSync, readFileSync } from "node:fs";

// Reads .env.local into process.env (Next.js does this for the site, not for scripts).
export function loadEnv() {
  const file = new URL("../.env.local", import.meta.url);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const UA = { headers: { "User-Agent": "TradeScore data import (personal project)" } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET a JSON url, retrying a few times. Returns null on 404.
export async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, UA);
    if (res.status === 404) return null;
    if (res.ok) return res.json();
    await sleep(500 * (i + 1));
  }
  throw new Error(`GET ${url} failed`);
}

// Runs `fn` on every item with at most `limit` requests at the same time.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// --- tiny CSV helpers (no quotes inside our values except names, which we quote) ---
export function toCsv(rows, columns) {
  const esc = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  const split = (line) => {
    const out = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const [header, ...rest] = lines.map(split);
  return rest.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? "").trim()])));
}
