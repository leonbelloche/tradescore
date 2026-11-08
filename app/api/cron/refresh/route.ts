// Vercel Cron calls this every morning (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
import { revalidatePath } from "next/cache";
import { refreshData, saveSite } from "@/lib/admin/refresh";

export const maxDuration = 300; // the refresh makes ~1000 ESPN requests

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const summary = await refreshData();
    revalidatePath("/", "layout");
    return Response.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await saveSite({ lastRefreshError: { at: new Date().toISOString(), message } }).catch(() => {});
    return Response.json({ error: message }, { status: 500 });
  }
}
