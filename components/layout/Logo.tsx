import Link from "next/link";

// "TRADE [SCORE]" — SCORE sits on an amber scoreboard tile.
export default function Logo({ size = "md" }: { size?: "md" | "sm" }) {
  const text = size === "sm" ? "text-base" : "text-xl sm:text-2xl";
  return (
    <Link href="/" className={`display flex items-center gap-1 font-extrabold leading-none ${text}`} aria-label="Trade Score home">
      Trade
      <span className="led rounded-[3px] bg-accent px-1 pb-px pt-0.5 text-black">Score</span>
    </Link>
  );
}
