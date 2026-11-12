// Dev helper: a signed post-card image URL for one player (bargain / overpaid style).
// Run: npx tsx --env-file=.env.local scripts/card-url.mts "Deni Avdija" "Best contracts"
import { valueLabel } from "@/lib/admin/xPosts";
import { cardImageUrl } from "@/lib/social/channels";
import { getValuedPlayers } from "@/lib/players/values";
import { formatMoney } from "@/lib/format";

const [name, kicker = "Best contracts"] = process.argv.slice(2);
const { players } = await getValuedPlayers();
const p = players.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
if (!p) throw new Error(`${name} not found`);
console.log(`${p.name} | ${p.team.name} | age ${p.age} | ${formatMoney(p.salary)} x ${p.yearsLeft} | GmSc ${p.gameScore.toFixed(1)} | avail ${p.availability.toFixed(2)} | TV ${p.score}`);
console.log(
  cardImageUrl(
    {
      type: "stat",
      kicker,
      title: p.name,
      sub: valueLabel(p.score),
      meta: [p.team.short_name ?? p.team.name, `${formatMoney(p.salary)} a year`, `${p.yearsLeft} yr${p.yearsLeft > 1 ? "s" : ""} left`],
      big: p.score,
      bigLabel: "Trade Value",
      photo: p.headshotUrl,
      logo: p.team.logo_url,
    },
    "x",
    false,
  ),
);
