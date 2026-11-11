// Publishes on the Trade Score Instagram account through the official Instagram API (content publishing).
// Needs a professional (Business or Creator) Instagram account, its user id and a long-lived access token.
// Instagram downloads the image itself, so it must be at a PUBLIC address (works on the live site, not on localhost).
const API = "https://graph.instagram.com/v23.0";

const env = () => ({ user: process.env.INSTAGRAM_USER_ID, token: process.env.INSTAGRAM_ACCESS_TOKEN });
export const instagramConnected = () => Boolean(env().user && env().token);

async function post<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: "POST", body: new URLSearchParams({ ...params, access_token: env().token! }), cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || json.error) throw new Error(`Instagram a refusé la demande : ${json.error?.message ?? `HTTP ${res.status}`}`);
  return json;
}
async function get<T>(path: string, fields: string): Promise<T> {
  const res = await fetch(`${API}${path}?fields=${fields}&access_token=${encodeURIComponent(env().token!)}`, { cache: "no-store" });
  return (await res.json()) as T;
}

export async function publishOnInstagram(caption: string, publicImageUrl: string): Promise<{ id: string; url: string }> {
  if (!instagramConnected()) throw new Error("Instagram n'est pas connecté : ajoute INSTAGRAM_USER_ID et INSTAGRAM_ACCESS_TOKEN.");
  if (/localhost|127\.0\.0\.1/.test(publicImageUrl)) throw new Error("Instagram needs a public image address: publish from the live site, not from localhost.");
  const { user } = env();
  // 1. Instagram fetches the image and prepares the post ("container")
  const container = await post<{ id: string }>(`/${user}/media`, { image_url: publicImageUrl, caption });
  // 2. Wait until it is ready (usually a few seconds for an image)
  for (let i = 0; i < 10; i++) {
    const s = await get<{ status_code?: string }>(`/${container.id}`, "status_code");
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR") throw new Error("Instagram could not read the image.");
    await new Promise((r) => setTimeout(r, 1500));
  }
  // 3. Publish
  const media = await post<{ id: string }>(`/${user}/media_publish`, { creation_id: container.id });
  const info = await get<{ permalink?: string }>(`/${media.id}`, "permalink").catch(() => ({ permalink: undefined }));
  return { id: media.id, url: info.permalink ?? "https://www.instagram.com/" };
}

// Publishes a Reel. The video must be at a public https address (we put it in Supabase Storage first).
export async function publishReelOnInstagram(caption: string, publicVideoUrl: string): Promise<{ id: string; url: string }> {
  if (!instagramConnected()) throw new Error("Instagram n'est pas connecté : ajoute INSTAGRAM_USER_ID et INSTAGRAM_ACCESS_TOKEN.");
  const { user } = env();
  const container = await post<{ id: string }>(`/${user}/media`, { media_type: "REELS", video_url: publicVideoUrl, caption, share_to_feed: "true" });
  // Instagram processes the video (up to a couple of minutes)
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const s = await get<{ status_code?: string }>(`/${container.id}`, "status_code");
    if (s.status_code === "FINISHED") {
      ready = true;
      break;
    }
    if (s.status_code === "ERROR") throw new Error("Instagram could not process the video.");
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!ready) throw new Error("Instagram is still processing the video. Try “Send to Instagram” again in a minute.");
  const media = await post<{ id: string }>(`/${user}/media_publish`, { creation_id: container.id });
  const info = await get<{ permalink?: string }>(`/${media.id}`, "permalink").catch(() => ({ permalink: undefined }));
  return { id: media.id, url: info.permalink ?? "https://www.instagram.com/" };
}
