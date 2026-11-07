// "01  LATEST TRADES  2026-27" with an amber index and a thin rule under it.
export default function SectionTitle({
  title,
  sub,
  live,
  index,
  action,
}: {
  title: string;
  sub?: string;
  live?: boolean;
  index?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end gap-3 border-b border-border pb-2">
      {index !== undefined && <span className="num text-sm text-accent">{String(index).padStart(2, "0")}</span>}
      <h2 className="display text-xl font-bold leading-none sm:text-2xl">{title}</h2>
      {sub && <span className="display pb-0.5 text-sm font-bold text-muted">{sub}</span>}
      {live && (
        <span className="display flex items-center gap-1 pb-0.5 text-xs font-bold text-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden /> Live
        </span>
      )}
      {action && <span className="ml-auto pb-0.5">{action}</span>}
    </div>
  );
}
