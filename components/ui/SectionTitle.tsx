// "LATEST TRADES  2026-27 ———————"
export default function SectionTitle({ title, sub, live }: { title: string; sub?: string; live?: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="display text-xl font-bold tracking-[0.06em] sm:text-2xl">{title}</h2>
      {sub && <span className="display text-sm font-medium text-muted">{sub}</span>}
      {live && (
        <span className="display flex items-center gap-1 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden /> Live
        </span>
      )}
      <span className="h-px flex-1 bg-border-strong" aria-hidden />
    </div>
  );
}
