// Temporary block shown on pages that are not built yet.
export default function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-3">
      <h1 className="text-3xl font-black tracking-tight">{title}</h1>
      <p className="text-muted">{description}</p>
      <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
        Coming soon.
      </div>
    </section>
  );
}
