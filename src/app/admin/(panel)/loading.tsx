export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-64 animate-pulse rounded bg-sand" />
      <div className="mt-8 grid gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded bg-white" />)}</div>
      <div className="mt-6 h-72 animate-pulse rounded bg-white" />
    </div>
  );
}
