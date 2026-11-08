// Page title inside the admin panel (the sidebar handles navigation and log out).
export default function AdminHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
      <div className="space-y-1">
        <h1 className="display text-3xl font-extrabold tracking-[-0.03em]">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
