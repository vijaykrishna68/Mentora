interface PlaceholderPageProps {
  title: string;
  description: string;
}

/** Stands in for a route not yet built in this phase — real content lands in a later phase. */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal-faint">Coming soon</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-charcoal">{title}</h1>
      <p className="mt-3 max-w-lg text-sm text-charcoal-muted">{description}</p>
    </div>
  );
}
