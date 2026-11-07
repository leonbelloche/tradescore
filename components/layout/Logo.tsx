import Link from "next/link";

// "TRADE [SCORE]" — SCORE sits on an amber scoreboard tile.
export default function Logo({ size = "md" }: { size?: "md" | "sm" }) {
  const text = size === "sm" ? "text-lg" : "text-2xl sm:text-3xl";
  return (
    <Link href="/" className={`display flex items-center gap-1.5 font-extrabold leading-none ${text}`} aria-label="Trade Score home">
      Trade
      <span className="led rounded-[4px] bg-accent px-1.5 pb-0.5 pt-1 text-black">Score</span>
    </Link>
  );
}
