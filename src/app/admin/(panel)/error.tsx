"use client";
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="admin-card max-w-xl p-8" role="alert">
      <h1 className="font-display text-2xl text-forest">Something went wrong</h1>
      <p className="mt-2 text-sm text-stone">Your last change may not have been saved. Try again; if it persists, note the reference below.</p>
      {error.digest && <p className="mt-2 font-mono text-xs">Ref: {error.digest}</p>}
      <button onClick={reset} className="admin-btn mt-6">Try again</button>
    </div>
  );
}
