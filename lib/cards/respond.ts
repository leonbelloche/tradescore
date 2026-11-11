// Turns a card ImageResponse into the final HTTP response: PNG, or JPEG for Instagram (it only accepts JPEG).
import sharp from "sharp";

export async function cardResponse(image: Response, jpeg: boolean): Promise<Response> {
  // No cache on your computer, so a design change shows up at once.
  const headers = { "Cache-Control": process.env.NODE_ENV === "development" ? "no-store" : "public, max-age=3600, s-maxage=86400" };
  if (!jpeg) return new Response(image.body, { headers: { ...headers, "Content-Type": "image/png" } });
  const png = Buffer.from(await image.arrayBuffer());
  const jpg = await sharp(png).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { ...headers, "Content-Type": "image/jpeg" } });
}
