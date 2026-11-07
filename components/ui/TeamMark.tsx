import Image from "next/image";

// Team logo, or a round mark with the abbreviation when there is no logo.
export default function TeamMark({
  abbreviation,
  logoUrl,
  size = "sm",
}: {
  abbreviation: string;
  logoUrl?: string | null;
  size?: "sm" | "lg";
}) {
  const box = size === "lg" ? "h-12 w-12 text-sm" : "h-7 w-7 text-[10px]";
  if (logoUrl) {
    const px = size === "lg" ? 48 : 28;
    return <Image src={logoUrl} alt={`${abbreviation} logo`} width={px} height={px} className={`${box} shrink-0 object-contain`} />;
  }
  return (
    <span
      className={`display inline-flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 font-bold text-muted ${box}`}
    >
      {abbreviation}
    </span>
  );
}
