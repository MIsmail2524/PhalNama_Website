"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-x max-w-xl py-24 text-center" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display-md mt-4 text-forest">This page did not load properly.</h1>
      <p className="lede mt-4">Please try again. If it keeps happening, message us and we will help — your bag is saved.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-outline">Home</Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-stone">Reference: {error.digest}</p>}
    </div>
  );
}
