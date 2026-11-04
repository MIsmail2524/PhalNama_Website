"use client";
import { useEffect, useState } from "react";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Follows the source field until the user edits the slug by hand. */
export function SlugField({ name, from, defaultValue }: { name: string; from?: string; defaultValue?: string | null }) {
  const [v, setV] = useState(defaultValue ?? "");
  const [manual, setManual] = useState(!!defaultValue);
  useEffect(() => {
    if (manual || !from) return;
    const el = document.querySelector<HTMLInputElement>(`[name="${from}"]`);
    if (!el) return;
    const on = () => setV(slugify(el.value));
    el.addEventListener("input", on);
    return () => el.removeEventListener("input", on);
  }, [from, manual]);
  return <input name={name} value={v} onChange={(e) => { setManual(true); setV(e.target.value); }} className="admin-input font-mono" />;
}
