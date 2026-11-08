import Link from "next/link";

export const TAGLINE = "Who got robbed? We do the math.";

// "trade score" in lowercase with a red pen stroke under it. `tagline` adds the one-line pitch below.
export default function Logo({ size = "md", tagline = false }: { size?: "md" | "sm"; tagline?: boolean }) {
  const text = size === "sm" ? "text-base" : "text-xl sm:text-2xl";
  return (
    <Link href="/" className="flex flex-col leading-none" aria-label="Trade Score home">
      <span className={`display pen-underline self-start font-extrabold lowercase tracking-[-0.04em] ${text}`}>trade score</span>
      {tagline && <span className="num mt-2 hidden text-[11px] text-muted sm:block">{TAGLINE}</span>}
    </Link>
  );
}
