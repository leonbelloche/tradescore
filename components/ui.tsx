// Small shared UI pieces.
import Image from "next/image";

// "LATEST TRADES  Wed, Nov 4 ———————"
export function SectionTitle({ title, sub, live }: { title: string; sub?: string; live?: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="display text-xl font-bold tracking-[0.06em] sm:text-2xl">{title}</h2>
      {sub && <span className="display text-sm font-medium text-muted">{sub}</span>}
      {live && (
        <span className="display flex items-center gap-1 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" /> Live
        </span>
      )}
      <span className="h-px flex-1 bg-border-strong" />
    </div>
  );
}

// Dark rounded card used for every block.
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[14px] border border-border bg-surface ${className}`}>{children}</div>;
}

// Team logo, or a round mark with the abbreviation when there is no logo.
export function TeamMark({
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
