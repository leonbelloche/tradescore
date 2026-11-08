// A real action photo of a player: the thumbnail of his latest ESPN clip or story.
import { cacheLife } from "next/cache";

export type AthleteMedia = { image: string; caption: string; url: string | null; published: string };

type OverviewItem = { headline?: string; published?: string; links?: { web?: { href?: string } }; images?: { url?: string; width?: number }[] };

export async function getAthleteMedia(espnId: string, name: string): Promise<AthleteMedia | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}/overview`);
    if (!res.ok) return null;
    const json = (await res.json()) as { news?: OverviewItem[] };
    const withImage = (json.news ?? []).filter((n) => n.images?.[0]?.url && n.headline);
    const last = name.split(" ").filter((w) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(w)).pop() ?? name;
    // Prefer a clip about him (his name in the title) over a team highlight.
    const item = withImage.find((n) => n.headline!.includes(last)) ?? withImage[0];
    if (!item) return null;
    return { image: item.images![0].url!, caption: item.headline!, url: item.links?.web?.href ?? null, published: item.published ?? "" };
  } catch {
    return null; // no photo is not an error: the card falls back to the headshot
  }
}
