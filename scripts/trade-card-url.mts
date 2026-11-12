// Dev helper: a signed trade-card image URL. Run: npx tsx --env-file=.env.local scripts/trade-card-url.mts <trade-slug> "<punchline>"
import { cardImageUrl } from "@/lib/social/channels";

const [id, line] = process.argv.slice(2);
console.log(cardImageUrl({ type: "trade", id, line }, "x", false));
