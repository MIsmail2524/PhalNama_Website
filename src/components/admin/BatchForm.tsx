"use client";
import { useActionState, useState } from "react";
import type { Batch } from "@prisma/client";
import { saveBatchAction } from "@/app/admin/(panel)/actions";
import { ImagesField } from "./ImageField";
import { MarkdownField } from "./MarkdownField";
import { SubmitButton } from "./SubmitButton";

const d = (v: Date | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export function BatchForm({ id, batch, products, origins }: {
  id: string | null;
  batch: Batch | null;
  products: { id: string; name: string; originId: string | null; variants: { id: string; name: string; netWeightKg: number }[] }[];
  origins: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveBatchAction.bind(null, id), null);
  const [productId, setProductId] = useState(batch?.productId ?? products[0]?.id ?? "");
  const product = products.find((p) => p.id === productId);
  return (
    <form action={action} className="admin-card space-y-5 p-6">
      {state && !state.ok && <p className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <div><label className="admin-label">Batch code</label><input name="code" defaultValue={batch?.code} placeholder="Leave empty to generate" className="admin-input font-mono uppercase" /></div>
        <div>
          <label className="admin-label">Product *</label>
          <select name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} className="admin-input">
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="admin-label">Pack</label>
          <select name="variantId" defaultValue={batch?.variantId ?? ""} key={productId} className="admin-input">
            <option value="">Mixed / not specific</option>
            {product?.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="admin-label">Origin</label>
          <select name="originId" defaultValue={batch?.originId ?? product?.originId ?? ""} key={`o-${productId}`} className="admin-input">
            <option value="">—</option>
            {origins.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div><label className="admin-label">Orchard / block</label><input name="orchardBlock" defaultValue={batch?.orchardBlock ?? ""} className="admin-input" placeholder="e.g. Block 7" /></div>
        <div><label className="admin-label">Selection grade</label><input name="grade" defaultValue={batch?.grade ?? ""} className="admin-input" placeholder="As recorded at sorting" /></div>
        <div><label className="admin-label">Harvest date</label><input name="harvestDate" type="date" defaultValue={d(batch?.harvestDate)} className="admin-input" /></div>
        <div><label className="admin-label">Packing date</label><input name="packingDate" type="date" defaultValue={d(batch?.packingDate)} className="admin-input" /></div>
        <div><label className="admin-label">Cartons packed</label><input name="quantityPacked" type="number" min={0} defaultValue={batch?.quantityPacked ?? ""} className="admin-input" /></div>
        <div><label className="admin-label">Net weight per carton (kg)</label><input name="netWeightKg" type="number" step="0.01" defaultValue={batch?.netWeightKg ?? ""} className="admin-input" /></div>
        {!id && <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="addToStock" defaultChecked className="accent-forest" /> Add cartons packed to the pack&apos;s available stock</label>}
      </div>
      <div><label className="admin-label">Batch story</label><MarkdownField name="story" defaultValue={batch?.story} /></div>
      <div><label className="admin-label">Quality notes</label><textarea name="qualityNotes" rows={3} defaultValue={batch?.qualityNotes ?? ""} className="admin-input" /></div>
      <div><label className="admin-label">Harvest photographs</label><ImagesField name="harvestPhotos" defaultValue={batch?.harvestPhotos ?? []} folder="batches" /></div>
      <div><label className="admin-label">Packing photographs</label><ImagesField name="packingPhotos" defaultValue={batch?.packingPhotos ?? []} folder="batches" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={batch?.published ?? true} className="accent-forest" /> Trace page visible to customers</label>
      <p className="text-xs text-stone">Only record information you actually have. Empty fields are simply not shown on the trace page.</p>
      <SubmitButton>{id ? "Save batch" : "Create batch"}</SubmitButton>
    </form>
  );
}
