import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="space-y-6 pt-6 text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Who won the trade?
        </h1>
        <p className="mx-auto max-w-md text-muted">
          Build any NBA trade and get a Trade Score out of 100 for each team.
        </p>
        <Link
          href="/trade"
          className="inline-block rounded-full bg-accent px-8 py-4 text-lg font-bold text-black transition hover:brightness-110"
        >
          Build a trade
        </Link>
      </section>

      {/* Popular trades (filled in later steps) */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Popular trades</h2>
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
          No trades yet.
        </div>
      </section>

      <p className="text-center text-sm text-muted">
        Curious how we score trades?{" "}
        <Link href="/method" className="text-accent underline">
          Read the method
        </Link>
      </p>
    </div>
  );
}
