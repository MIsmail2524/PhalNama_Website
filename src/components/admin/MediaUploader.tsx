"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadImageAction } from "@/admin/actions";

export function MediaUploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <label className="block cursor-pointer rounded border-2 border-dashed border-sand-300 bg-white p-8 text-center text-sm text-stone hover:border-forest">
      {busy ? "Uploading…" : "Click to upload images (JPG, PNG, WebP — up to 8 MB each)"}
      <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
        setBusy(true); setErr("");
        for (const f of Array.from(e.target.files ?? [])) {
          const fd = new FormData();
          fd.set("file", f);
          const r = await uploadImageAction(fd);
          if (r.error) setErr(r.error);
        }
        setBusy(false);
        router.refresh();
      }} />
      {err && <span className="mt-2 block text-danger">{err}</span>}
    </label>
  );
}
