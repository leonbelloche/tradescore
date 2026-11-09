// Card image URLs are signed: only the server can make a card with a given text, so nobody can use
// /api/cards to print fake "Trade Score" images. The key is derived from ADMIN_PASSWORD (server only).
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type CardFormat = "x" | "ig"; // x = 1600x900 (16:9), ig = 1080x1350 (4:5, Instagram portrait)
export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  x: { width: 1600, height: 900 },
  ig: { width: 1080, height: 1350 },
};

function key(): Buffer {
  const base = process.env.ADMIN_PASSWORD || process.env.SUPABASE_SECRET_KEY || "tradescore-dev-cards";
  return createHash("sha256").update(`tradescore-cards-v1:${base}`).digest();
}

// Canonical string of the params (sorted, without the signature itself).
function canonical(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([k]) => k !== "s")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

const sign = (path: string, params: URLSearchParams) => createHmac("sha256", key()).update(`${path}?${canonical(params)}`).digest("hex").slice(0, 32);

// "/api/cards/trade/abc" + {line: "..."} -> "/api/cards/trade/abc?line=...&s=<signature>"
export function signedCardUrl(path: string, values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== "") params.set(k, v);
  params.set("s", sign(path, params));
  return `${path}?${params.toString()}`;
}

export function verifyCardUrl(path: string, params: URLSearchParams): boolean {
  const s = params.get("s") ?? "";
  const expected = sign(path, params);
  return s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected));
}
