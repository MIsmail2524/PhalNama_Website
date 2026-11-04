"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconClose, IconSearch } from "@/components/ui/Icons";

type Result = { products: { slug: string; name: string; category: string }[]; articles: { slug: string; title: string; category: string }[] };

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then(setRes)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const empty = res && !res.products.length && !res.articles.length;
  return (
    <div className="fixed inset-0 z-[80] animate-fade bg-ivory/98 backdrop-blur" role="dialog" aria-modal="true" aria-label="Search">
      <div className="container-x pt-6">
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="Close search" className="p-2 text-forest"><IconClose /></button>
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <label htmlFor="site-search" className="eyebrow">Search Phalnama</label>
          <div className="mt-3 flex items-center gap-3 border-b-2 border-forest pb-3">
            <IconSearch className="h-6 w-6 text-forest" />
            <input
              id="site-search"
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Kinnow, gift boxes, Bhalwal…"
              className="w-full bg-transparent font-display text-3xl text-forest placeholder:text-stone/40 focus:outline-none sm:text-4xl"
            />
          </div>
          <div className="mt-8 min-h-40" onClick={(e) => (e.target as HTMLElement).closest("a") && onClose()}>
            {loading && <p className="text-sm text-stone">Searching…</p>}
            {empty && <p className="text-stone">Nothing found for “{q}”. Try “Kinnow” or “gift”.</p>}
            {res && res.products.length > 0 && (
              <section className="mb-8">
                <h3 className="eyebrow mb-3">Fruit</h3>
                <ul className="divide-y divide-sand-300">
                  {res.products.map((p) => (
                    <li key={p.slug}><Link href={`/shop/${p.slug}`} className="flex justify-between py-3 text-lg text-forest hover:text-citrus-700"><span>{p.name}</span><span className="text-sm text-stone">{p.category}</span></Link></li>
                  ))}
                </ul>
              </section>
            )}
            {res && res.articles.length > 0 && (
              <section>
                <h3 className="eyebrow mb-3">Harvest Journal</h3>
                <ul className="divide-y divide-sand-300">
                  {res.articles.map((a) => (
                    <li key={a.slug}><Link href={`/journal/${a.slug}`} className="flex justify-between py-3 text-lg text-forest hover:text-citrus-700"><span>{a.title}</span><span className="text-sm text-stone">{a.category}</span></Link></li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
