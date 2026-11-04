"use client";
import { useUnsavedGuard } from "./UnsavedGuard";
import { useActionState, useState } from "react";
import type { Product, ProductVariant } from "@prisma/client";
import { saveProductAction } from "@/app/admin/(panel)/actions";
import { ImagesField } from "./ImageField";
import { MarkdownField } from "./MarkdownField";
import { SlugField } from "./SlugField";
import { SubmitButton } from "./SubmitButton";
import { Card } from "./ui";

type V = {
  id?: string;
  name: string;
  sku: string;
  description: string;
  netWeightKg: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  trackStock: boolean;
  isGiftPack: boolean;
  packaging: string;
  active: boolean;
  sortOrder: number;
  _delete?: boolean;
};

const toV = (v: ProductVariant): V => ({
  id: v.id,
  name: v.name,
  sku: v.sku ?? "",
  description: v.description ?? "",
  netWeightKg: String(v.netWeightKg),
  price: v.price === null ? "" : String(v.price),
  compareAtPrice: v.compareAtPrice === null ? "" : String(v.compareAtPrice),
  stock: String(v.stock),
  trackStock: v.trackStock,
  isGiftPack: v.isGiftPack,
  packaging: v.packaging ?? "",
  active: v.active,
  sortOrder: v.sortOrder,
});

const blank = (n: number): V => ({ name: "", sku: "", description: "", netWeightKg: "", price: "", compareAtPrice: "", stock: "0", trackStock: true, isGiftPack: false, packaging: "", active: true, sortOrder: n });

export function ProductForm({ id, product, categories, origins }: {
  id: string | null;
  product: (Product & { variants: ProductVariant[] }) | null;
  categories: { id: string; name: string; status: string }[];
  origins: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveProductAction.bind(null, id), null);
  const guard = useUnsavedGuard();
  const [variants, setVariants] = useState<V[]>(product?.variants.map(toV) ?? [blank(1)]);
  const upd = (i: number, patch: Partial<V>) => setVariants((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));

  return (
    <form onChange={guard.onChange} onSubmit={guard.onSubmit} action={action} className="space-y-6">
      {state && !state.ok && <p className="rounded border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>}
      <input type="hidden" name="variants" value={JSON.stringify(variants.map((v) => ({ ...v, netWeightKg: v.netWeightKg || "0", stock: v.stock || "0" })))} />

      <Card title="Basics">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block"><span className="admin-label">Name *</span><input name="name" required defaultValue={product?.name} className="admin-input" /></label>
          <div><label className="admin-label">URL slug</label><SlugField name="slug" from="name" defaultValue={product?.slug} /></div>
          <div>
            <label className="admin-label" htmlFor="f-categoryId">Category *</label>
            <select id="f-categoryId" name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} className="admin-input">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status !== "ACTIVE" ? ` (${c.status.toLowerCase()})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="f-originId">Origin</label>
            <select id="f-originId" name="originId" defaultValue={product?.originId ?? ""} className="admin-input">
              <option value="">—</option>
              {origins.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="admin-label" htmlFor="f-status">Status</label>
            <select id="f-status" name="status" defaultValue={product?.status ?? "DRAFT"} className="admin-input">
              <option value="DRAFT">Draft — hidden</option>
              <option value="ACTIVE">Active — on sale</option>
              <option value="UPCOMING">Upcoming — coming soon</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <label className="block"><span className="admin-label">Sort order</span><input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className="admin-input" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={product?.featured ?? true} className="accent-forest" /> Feature on homepage</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="giftable" defaultChecked={product?.giftable ?? true} className="accent-forest" /> Can be sent as a gift</label>
          <label className="block md:col-span-2"><span className="admin-label">Short description</span><textarea name="shortDescription" rows={2} defaultValue={product?.shortDescription ?? ""} className="admin-input" /></label>
        </div>
      </Card>

      <Card title="Photographs">
        <ImagesField name="images" defaultValue={product?.images ?? []} folder="products" />
        <p className="mt-2 text-xs text-stone">First image is the main image. Use genuine photographs of your fruit and packaging.</p>
      </Card>

      <Card title="Packs, prices & stock">
        <div className="space-y-4">
          {variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className={`rounded border p-4 ${v._delete ? "border-danger/40 bg-danger/5 opacity-60" : "border-sand-300"}`}>
              <div className="grid gap-3 md:grid-cols-6">
                <label className="block md:col-span-2"><span className="admin-label">Pack name *</span><input value={v.name} onChange={(e) => upd(i, { name: e.target.value })} className="admin-input" placeholder="5 KG Family Pack" /></label>
                <label className="block"><span className="admin-label">Net fruit weight (kg) *</span><input value={v.netWeightKg} onChange={(e) => upd(i, { netWeightKg: e.target.value })} type="number" step="0.1" className="admin-input" /></label>
                <label className="block"><span className="admin-label">Price (PKR)</span><input value={v.price} onChange={(e) => upd(i, { price: e.target.value })} type="number" className="admin-input" placeholder="Not set" /></label>
                <label className="block"><span className="admin-label">Compare-at (PKR)</span><input value={v.compareAtPrice} onChange={(e) => upd(i, { compareAtPrice: e.target.value })} type="number" className="admin-input" /></label>
                <label className="block"><span className="admin-label">Stock</span><input value={v.stock} onChange={(e) => upd(i, { stock: e.target.value })} type="number" min={0} className="admin-input" disabled={!v.trackStock} /></label>
                <label className="block"><span className="admin-label">SKU</span><input value={v.sku} onChange={(e) => upd(i, { sku: e.target.value })} className="admin-input" /></label>
                <label className="block md:col-span-2"><span className="admin-label">Packaging</span><input value={v.packaging} onChange={(e) => upd(i, { packaging: e.target.value })} className="admin-input" placeholder="Family carton" /></label>
                <label className="block md:col-span-3"><span className="admin-label">Pack description</span><input value={v.description} onChange={(e) => upd(i, { description: e.target.value })} className="admin-input" /></label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={v.active} onChange={(e) => upd(i, { active: e.target.checked })} className="accent-forest" /> Available</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={v.trackStock} onChange={(e) => upd(i, { trackStock: e.target.checked })} className="accent-forest" /> Track stock</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={v.isGiftPack} onChange={(e) => upd(i, { isGiftPack: e.target.checked })} className="accent-forest" /> Gift pack (shown on Gift Boxes page)</label>
                <label className="flex items-center gap-2">Order <input type="number" value={v.sortOrder} onChange={(e) => upd(i, { sortOrder: Number(e.target.value) })} className="admin-input !w-16 !py-1" /></label>
                <button type="button" className="ml-auto text-xs font-semibold text-danger" onClick={() => (v.id ? upd(i, { _delete: !v._delete }) : setVariants((vs) => vs.filter((_, k) => k !== i)))}>
                  {v._delete ? "Undo remove" : "Remove pack"}
                </button>
              </div>
              {!v.price && !v._delete && <p className="mt-2 text-xs text-citrus-700">No price yet — customers will see “Price announced soon” and cannot order this pack.</p>}
            </div>
          ))}
          <button type="button" onClick={() => setVariants((vs) => [...vs, blank(vs.length + 1)])} className="admin-btn-secondary">+ Add pack size</button>
        </div>
      </Card>

      <Card title="Story & details">
        <div className="space-y-5">
          <div><label className="admin-label">About this fruit</label><MarkdownField name="description" defaultValue={product?.description} /></div>
          <div><label className="admin-label">How we select / grade</label><MarkdownField name="selectionInfo" defaultValue={product?.selectionInfo} /></div>
          <div><label className="admin-label">Delivery information</label><MarkdownField name="deliveryInfo" defaultValue={product?.deliveryInfo} /></div>
          <label className="block"><span className="admin-label">Natural variation note</span><textarea name="variationNote" rows={2} defaultValue={product?.variationNote ?? "Natural fruit varies slightly in size, shape and appearance."} className="admin-input" /></label>
        </div>
      </Card>

      <Card title="Search engines">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block"><span className="admin-label">SEO title</span><input name="seoTitle" defaultValue={product?.seoTitle ?? ""} className="admin-input" /></label>
          <label className="block"><span className="admin-label">SEO description</span><textarea name="seoDescription" rows={2} defaultValue={product?.seoDescription ?? ""} className="admin-input" /></label>
        </div>
      </Card>

      <div className="sticky bottom-0 flex gap-3 border-t border-sand-300 bg-[#f6f4ee]/95 py-4 backdrop-blur">
        <SubmitButton>{id ? "Save product" : "Create product"}</SubmitButton>
      </div>
    </form>
  );
}
