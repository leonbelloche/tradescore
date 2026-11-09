// Publishes on the Trade Score X account through the official X API (OAuth 1.0a user context:
// the 4 keys of your X developer app, generated for YOUR account). Server only.
// Pay-per-use API: each post costs a few cents, billed by X on your developer account.
import { createHmac, randomBytes } from "node:crypto";

const env = () => ({
  key: process.env.X_API_KEY,
  secret: process.env.X_API_SECRET,
  token: process.env.X_ACCESS_TOKEN,
  tokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
});
export const xConnected = () => Object.values(env()).every(Boolean);

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

// OAuth 1.0a "Authorization" header (JSON bodies are not part of the signature).
function authHeader(method: string, url: string): string {
  const { key, secret, token, tokenSecret } = env();
  const oauth: Record<string, string> = {
    oauth_consumer_key: key!,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token!,
    oauth_version: "1.0",
  };
  const u = new URL(url);
  const params = [...Object.entries(oauth), ...u.searchParams.entries()].map(([k, v]) => [enc(k), enc(v)]).sort(([a, b], [c, d]) => (a === c ? b.localeCompare(d) : a.localeCompare(c)));
  const base = [method.toUpperCase(), enc(`${u.origin}${u.pathname}`), enc(params.map(([k, v]) => `${k}=${v}`).join("&"))].join("&");
  oauth.oauth_signature = createHmac("sha1", `${enc(secret!)}&${enc(tokenSecret!)}`).update(base).digest("base64");
  return "OAuth " + Object.entries(oauth).map(([k, v]) => `${enc(k)}="${enc(v)}"`).join(", ");
}

async function call<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader("POST", url), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; detail?: string; title?: string; errors?: { message?: string }[] };
  if (!res.ok || !json.data) {
    const why = json.detail ?? json.errors?.[0]?.message ?? json.title ?? `HTTP ${res.status}`;
    throw new Error(`X refused the request: ${why}`);
  }
  return json.data;
}

// Uploads the image, then creates the post. Returns the post's link.
export async function publishOnX(text: string, image: Buffer): Promise<{ id: string; url: string }> {
  if (!xConnected()) throw new Error("X is not connected: add X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET.");
  const media = await call<{ id: string }>("https://api.x.com/2/media/upload", { media: image.toString("base64"), media_category: "tweet_image" });
  const post = await call<{ id: string }>("https://api.x.com/2/tweets", { text, media: { media_ids: [media.id] } });
  return { id: post.id, url: `https://x.com/i/status/${post.id}` };
}
