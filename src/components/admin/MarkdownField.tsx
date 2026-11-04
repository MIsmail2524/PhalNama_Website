"use client";
import { useState } from "react";
import { marked } from "marked";

export function MarkdownField({ name, defaultValue, required }: { name: string; defaultValue?: string | null; required?: boolean }) {
  const [v, setV] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <div className="mb-1 flex gap-3 text-xs">
        <button type="button" onClick={() => setPreview(false)} className={!preview ? "font-semibold text-forest" : "text-stone"}>Write</button>
        <button type="button" onClick={() => setPreview(true)} className={preview ? "font-semibold text-forest" : "text-stone"}>Preview</button>
        <span className="ml-auto text-stone">Markdown: ## heading, **bold**, *italic*, - list, [link](url), ![alt](image-url)</span>
      </div>
      <textarea name={name} required={required} value={v} onChange={(e) => setV(e.target.value)} rows={14} className={`admin-input font-mono text-[13px] leading-relaxed ${preview ? "hidden" : ""}`} />
      {preview && <div className="prose-pn min-h-40 rounded border border-sand-300 bg-white p-5 !text-base" dangerouslySetInnerHTML={{ __html: marked.parse(v, { async: false }) as string }} />}
    </div>
  );
}
