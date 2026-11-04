"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { uploadImageAction } from "@/admin/actions";

async function upload(file: File, folder: string) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("folder", folder);
  return uploadImageAction(fd);
}

export function ImageField({ name, defaultValue, folder = "media", onChange }: { name: string; defaultValue?: string | null; folder?: string; onChange?: (url: string) => void }) {
  const [url, setUrlState] = useState(defaultValue ?? "");
  const setUrl = (u: string) => {
    setUrlState(u);
    onChange?.(u);
  };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-start gap-3">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded border border-sand-300 bg-sand/50">
          {url ? <Image src={url} alt="" fill sizes="128px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-stone">No image</span>}
        </div>
        <div className="space-y-2">
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true); setErr("");
            const r = await upload(f, folder);
            setBusy(false);
            if (r.url) setUrl(r.url); else setErr(r.error ?? "Upload failed");
            e.target.value = "";
          }} />
          <button type="button" className="admin-btn-secondary !py-1.5 text-xs" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Uploading…" : url ? "Replace" : "Upload image"}</button>
          {url && <button type="button" className="block text-xs text-danger" onClick={() => setUrl("")}>Remove</button>}
          <input className="admin-input !py-1 text-xs" placeholder="…or paste image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          {err && <p className="text-xs text-danger">{err}</p>}
        </div>
      </div>
    </div>
  );
}

export function ImagesField({ name, defaultValue, folder = "media" }: { name: string; defaultValue?: string[]; folder?: string }) {
  const [urls, setUrls] = useState<string[]>(defaultValue ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const move = (i: number, d: number) => setUrls((u) => {
    const n = [...u];
    const j = i + d;
    if (j < 0 || j >= n.length) return n;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  return (
    <div>
      {urls.map((u) => <input key={u} type="hidden" name={name} value={u} />)}
      <div className="flex flex-wrap gap-3">
        {urls.map((u, i) => (
          <div key={u} className="group relative h-28 w-28 overflow-hidden rounded border border-sand-300 bg-sand/50">
            <Image src={u} alt="" fill sizes="112px" className="object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-forest px-1.5 text-[10px] font-semibold text-ivory">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 px-1 py-0.5 text-xs">
              <button type="button" onClick={() => move(i, -1)} aria-label="Move left">←</button>
              <button type="button" className="text-danger" onClick={() => setUrls((x) => x.filter((y) => y !== u))}>Remove</button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Move right">→</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="grid h-28 w-28 place-items-center rounded border border-dashed border-sand-300 text-xs text-stone hover:border-forest">
          {busy ? "Uploading…" : "+ Add images"}
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        setBusy(true); setErr("");
        for (const f of files) {
          const r = await upload(f, folder);
          if (r.url) setUrls((u) => [...u, r.url!]); else setErr(r.error ?? "Upload failed");
        }
        setBusy(false);
        e.target.value = "";
      }} />
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}
