"use client";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { formatPKR } from "@/lib/format";

export type BuyVariant = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  trackStock: boolean;
  netWeightKg: number;
};

export function variantAvailable(v: BuyVariant) {
  return v.price !== null && (!v.trackStock || v.stock > 0);
}

/** Compact variant picker + add to bag for product cards. */
export function QuickAdd({ product, variants, purchasable }: { product: { name: string; slug: string; image: string | null }; variants: BuyVariant[]; purchasable: boolean }) {
  const { add } = useCart();
  const first = variants.find(variantAvailable) ?? variants[0];
  const [selected, setSelected] = useState(first?.id);
  const v = variants.find((x) => x.id === selected);
  if (!variants.length) return null;
  const ok = purchasable && v && variantAvailable(v);
  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Pack size for ${product.name}`}>
        {variants.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={selected === x.id}
            onClick={() => setSelected(x.id)}
            className={`min-h-11 border px-3 text-xs font-medium transition ${selected === x.id ? "border-forest bg-forest text-ivory" : "border-sand-300 text-charcoal hover:border-forest"} ${!variantAvailable(x) ? "opacity-60" : ""}`}
          >
            {x.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!ok}
        onClick={() => v && v.price !== null && add({ variantId: v.id, productName: product.name, productSlug: product.slug, variantName: v.name, unitPrice: v.price, image: product.image, weightKg: v.netWeightKg })}
        className="btn-primary w-full"
      >
        {ok ? <>Add to bag · {formatPKR(v!.price)}</> : v?.price === null ? "Price announced soon" : "Sold out for now"}
      </button>
    </div>
  );
}
