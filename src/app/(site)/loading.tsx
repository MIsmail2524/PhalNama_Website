export default function Loading() {
  return (
    <div className="container-x py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-3 w-24 animate-pulse bg-sand" />
      <div className="mt-5 h-12 w-2/3 max-w-xl animate-pulse bg-sand" />
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] animate-pulse bg-sand/70" />)}
      </div>
    </div>
  );
}
